from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APIError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
)


ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


logger = logging.getLogger("gitsense.ai_briefing")


AI_NARRATION_SDK_TIMEOUT_SECONDS = 9.0
AI_NARRATION_HARD_TIMEOUT_SECONDS = 10.0
AI_NARRATION_MAX_TOKENS = 280
AI_NARRATION_TEMPERATURE = 0.2
CACHE_TTL_SECONDS = 90

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free"

OPENROUTER_REFERER = os.getenv("OPENROUTER_REFERER", "https://gitsense.tech")
OPENROUTER_APP_TITLE = os.getenv("OPENROUTER_APP_TITLE", "GitSense")


SYSTEM_PROMPT = (
    "You are GitSense's operational briefing writer for an engineering "
    "intelligence platform. You are NOT a chatbot or assistant. You "
    "produce dense, restrained, technically grounded summaries of a "
    "GitHub workspace's operational state — the way a senior engineer "
    "would describe what is happening, not how a marketer would frame it.\n\n"
    "RULES:\n"
    "1. Use only signals present in the provided JSON bundle. Never "
    "invent metrics, percentages, dates, repositories, or causes. If "
    "a signal is absent, do not reference it.\n"
    "2. Never claim certainty about root causes. Use grounded, "
    "observational phrasing: 'persisting', 'concentrated in', "
    "'has not improved', 'continues to widen', 'unchanged since'.\n"
    "3. Lead with the dominant operational pressure. Mention secondary "
    "signals only if they materially reinforce the primary one.\n"
    "4. Be specific. Reference concrete signal types (stale backlog, "
    "throughput gap, contributor concentration, recurrence trend) "
    "instead of generic terms like 'issues' or 'activity'.\n"
    "5. Output 3 to 5 sentences of prose. No bullet lists, headers, "
    "emojis, or section labels. No rhetorical questions.\n"
    "6. If the workspace is healthy, acknowledge it in 2 sentences and "
    "stop. Do not pad. Do not invent risks to sound thorough.\n"
    "7. Do not address the reader, do not use 'you', do not use "
    "marketing language, do not recommend generic SaaS practices. "
    "No phrases like 'consider', 'we recommend', 'best practices'.\n"
    "8. Prefer declarative engineering tone over narrative tone."
)


class AIBriefingService:
    """Interprets deterministic signal bundles into AI-narrated briefings.

    Provider client is the official OpenAI Python SDK (AsyncOpenAI)
    pointed at OpenRouter's OpenAI-compatible base URL. Configuration
    is environment-driven. Any OpenAI-compatible endpoint also works
    via the legacy AI_NARRATION_* env vars for backwards compatibility.

    If no provider is configured or the call fails, the service falls
    back to a deterministic prose summarizer so the dashboard always
    has a briefing.
    """

    def __init__(self) -> None:
        # Prefer OpenRouter configuration; fall back to the legacy
        # AI_NARRATION_* envs if those are the only thing set.
        openrouter_key = os.getenv("OPENROUTER_API_KEY") or ""
        legacy_key = os.getenv("AI_NARRATION_API_KEY") or ""

        self._api_key = openrouter_key or legacy_key

        if openrouter_key:
            self._base_url = OPENROUTER_BASE_URL
            self._model = os.getenv("OPENROUTER_MODEL") or OPENROUTER_DEFAULT_MODEL
            self._provider_label = "openrouter"
        else:
            self._base_url = (
                os.getenv("AI_NARRATION_BASE_URL")
                or "https://api.openai.com/v1"
            ).rstrip("/")
            self._model = os.getenv("AI_NARRATION_MODEL") or "gpt-4o-mini"
            self._provider_label = "openai-compatible"

        self._cache: dict[str, tuple[float, dict[str, Any]]] = {}
        self._client: AsyncOpenAI | None = self._build_client()

    def _build_client(self) -> AsyncOpenAI | None:
        if not self._api_key:
            return None

        default_headers: dict[str, str] = {}
        # OpenRouter recommends these (optional but useful for
        # attribution + free-tier rate limit identification).
        if self._provider_label == "openrouter":
            if OPENROUTER_REFERER:
                default_headers["HTTP-Referer"] = OPENROUTER_REFERER
            if OPENROUTER_APP_TITLE:
                default_headers["X-Title"] = OPENROUTER_APP_TITLE

        return AsyncOpenAI(
            api_key=self._api_key,
            base_url=self._base_url,
            timeout=AI_NARRATION_SDK_TIMEOUT_SECONDS,
            max_retries=0,
            default_headers=default_headers or None,
        )

    @property
    def is_provider_configured(self) -> bool:
        return self._client is not None

    async def generate_workspace_briefing(
        self,
        bundle: dict[str, Any],
    ) -> dict[str, Any]:
        cache_key = self._fingerprint(bundle, "briefing")
        cached = self._read_cache(cache_key)
        if cached is not None:
            return cached

        tone = bundle.get("health", {}).get("workspace_state") or "no_data"

        # Empty workspaces never call the LLM — there is nothing to
        # narrate, the deterministic call-to-action prose is what the
        # user actually needs.
        is_empty = (
            tone == "no_data"
            or bundle.get("workspace_repositories", 0) == 0
        )

        if not self.is_provider_configured or is_empty:
            briefing = self._deterministic_briefing(bundle, tone)
        else:
            briefing = None
            try:
                briefing = await self._call_provider_for_briefing(bundle, tone)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning(
                    "Briefing provider call raised: %s",
                    type(exc).__name__,
                )
                briefing = None
            if briefing is None:
                briefing = self._deterministic_briefing(bundle, tone)
                briefing["notes"] = [
                    "AI provider unavailable — using deterministic summary."
                ]

        self._write_cache(cache_key, briefing)
        return briefing

    async def generate_insight_narration(
        self,
        bundle: dict[str, Any],
    ) -> dict[str, Any]:
        insights = bundle.get("insights", []) or []
        cache_key = self._fingerprint(bundle, "narration")
        cached = self._read_cache(cache_key)
        if cached is not None:
            return cached

        if not insights:
            narration = self._deterministic_narration_empty(bundle)
            self._write_cache(cache_key, narration)
            return narration

        if not self.is_provider_configured:
            narration = self._deterministic_narration(bundle)
            self._write_cache(cache_key, narration)
            return narration

        narration = None
        try:
            narration = await self._call_provider_for_narration(bundle)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning(
                "Narration provider call raised: %s",
                type(exc).__name__,
            )
            narration = None

        if narration is None:
            narration = self._deterministic_narration(bundle)

        self._write_cache(cache_key, narration)
        return narration

    # ----- LLM calls (provider abstraction) -----

    async def _call_provider_for_briefing(
        self,
        bundle: dict[str, Any],
        tone: str,
    ) -> dict[str, Any] | None:
        user_prompt = self._build_briefing_user_prompt(bundle)
        text = await self._chat_completion(user_prompt)

        if not text:
            return None

        return {
            "summary": text,
            "headline": self._headline_for(tone),
            "tone": tone,
            "source": "llm",
            "model": self._model,
            "grounded_in": self._grounded_in(bundle),
            "generated_at": datetime.now(timezone.utc),
            "confidence": 0.75,
            "notes": [],
        }

    async def _call_provider_for_narration(
        self,
        bundle: dict[str, Any],
    ) -> dict[str, Any] | None:
        user_prompt = self._build_narration_user_prompt(bundle)
        text = await self._chat_completion(user_prompt)

        if not text:
            return None

        return {
            "narration": text,
            "source": "llm",
            "model": self._model,
            "generated_at": datetime.now(timezone.utc),
            "insights_considered": len(bundle.get("insights", []) or []),
            "confidence": 0.75,
        }

    async def _chat_completion(self, user_prompt: str) -> str | None:
        client = self._client

        if client is None:
            return None

        provider_task: asyncio.Task[Any] | None = None

        async def _invoke() -> Any:
            return await client.chat.completions.create(
                model=self._model,
                temperature=AI_NARRATION_TEMPERATURE,
                max_tokens=AI_NARRATION_MAX_TOKENS,
                stream=False,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )

        try:
            provider_task = asyncio.create_task(
                _invoke(),
                name="ai-briefing-provider-call",
            )
            completion = await asyncio.wait_for(
                asyncio.shield(provider_task),
                timeout=AI_NARRATION_HARD_TIMEOUT_SECONDS,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "AI provider call exceeded hard timeout of %.1fs; "
                "falling back deterministically.",
                AI_NARRATION_HARD_TIMEOUT_SECONDS,
            )
            if provider_task is not None and not provider_task.done():
                provider_task.cancel()
                try:
                    await asyncio.wait_for(provider_task, timeout=0.25)
                except (asyncio.TimeoutError, asyncio.CancelledError, Exception):
                    pass
            return None
        except asyncio.CancelledError:
            if provider_task is not None and not provider_task.done():
                provider_task.cancel()
            raise
        except (APITimeoutError, APIConnectionError, APIStatusError, APIError) as exc:
            logger.warning("AI provider returned error: %s", type(exc).__name__)
            return None
        except Exception as exc:
            logger.warning(
                "AI provider raised unexpected error: %s",
                type(exc).__name__,
            )
            return None

        try:
            content = completion.choices[0].message.content
        except (AttributeError, IndexError):
            return None

        if not isinstance(content, str):
            return None

        text = content.strip()
        if len(text) < 10:
            return None
        return text[:1600]

    # ----- Prompt builders -----

    @staticmethod
    def _build_briefing_user_prompt(bundle: dict[str, Any]) -> str:
        compact = json.dumps(bundle, separators=(",", ":"))
        return (
            "Write a workspace operational briefing grounded ONLY in the "
            "following JSON bundle. Output: 3 to 6 sentences of prose. "
            "Reference the workspace state, the most notable signals, any "
            "recurrence trends from history, and the contributor "
            "concentration if present. Do not enumerate metrics with raw "
            "numbers unless they appear in the bundle.\n\n"
            f"BUNDLE:\n{compact}"
        )

    @staticmethod
    def _build_narration_user_prompt(bundle: dict[str, Any]) -> str:
        compact = json.dumps(bundle, separators=(",", ":"))
        return (
            "Narrate the current operational insight set in 2 to 4 "
            "sentences. Only describe signals present in the JSON. Use "
            "grounded language. Connect related signals where the bundle "
            "supports it. Do not invent causes or recommend generic "
            "optimizations.\n\n"
            f"BUNDLE:\n{compact}"
        )

    # ----- Deterministic fallback summarizers -----

    def _deterministic_briefing(
        self,
        bundle: dict[str, Any],
        tone: str,
    ) -> dict[str, Any]:
        health = bundle.get("health", {}) or {}
        insights = bundle.get("insights", []) or []
        history = bundle.get("history", []) or []

        if tone == "no_data" or bundle.get("workspace_repositories", 0) == 0:
            summary = (
                "No repositories have been synced yet. Once a repository is "
                "indexed, GitSense will surface its workspace health, "
                "operational insights, and recurring risks here."
            )
        else:
            sentences: list[str] = []

            state_label = self._state_label(tone)
            score = health.get("workspace_score")
            primary = health.get("primary_concern")
            concentration = health.get("contributor_concentration")
            concentration_repo = health.get("top_concentration_repository")

            if state_label and score is not None:
                opener = (
                    f"Workspace state is {state_label} (score {score}). "
                )
                if primary:
                    opener += f"The dominant signal is {primary.lower()}."
                sentences.append(opener.strip())

            high_severity = [i for i in insights if i.get("severity") in {"high", "medium"}]
            if high_severity:
                titles = ", ".join(i.get("title", "") for i in high_severity[:3] if i.get("title"))
                if titles:
                    sentences.append(
                        f"Active operational signals include: {titles}."
                    )

            worsening = [e for e in history if e.get("severity_trend") == "worsening"]
            improving = [e for e in history if e.get("severity_trend") == "improving"]
            if worsening:
                sentences.append(
                    f"{len(worsening)} signal{'s' if len(worsening) != 1 else ''} "
                    "have been worsening across recent insight cycles."
                )
            elif improving:
                sentences.append(
                    f"{len(improving)} previously elevated signal"
                    f"{'s have' if len(improving) != 1 else ' has'} "
                    "started to improve."
                )

            if (
                concentration is not None
                and concentration_repo
                and concentration >= 0.6
            ):
                pct = int(round(float(concentration) * 100))
                sentences.append(
                    f"Workspace activity remains concentrated in "
                    f"{concentration_repo} ({pct}% share)."
                )

            if not sentences:
                sentences.append(
                    "No elevated operational risks were detected in this cycle."
                )

            summary = " ".join(sentences)

        return {
            "summary": summary,
            "headline": self._headline_for(tone),
            "tone": tone,
            "source": "deterministic",
            "model": None,
            "grounded_in": self._grounded_in(bundle),
            "generated_at": datetime.now(timezone.utc),
            "confidence": 0.65,
            "notes": [],
        }

    def _deterministic_narration(
        self,
        bundle: dict[str, Any],
    ) -> dict[str, Any]:
        insights = bundle.get("insights", []) or []
        primary = bundle.get("health", {}).get("primary_concern")

        top = insights[:3]
        titles = [i.get("title", "") for i in top if i.get("title")]

        if not titles:
            text = "No active operational signals were detected in this cycle."
        else:
            joined = "; ".join(titles)
            text = (
                f"Active operational signals: {joined}. "
            )
            if primary:
                text += (
                    f"The dominant pressure is {primary.lower()}, "
                    "and the related signals are reinforcing each other."
                )
            else:
                text += "These signals are independent and not yet compounding."

        return {
            "narration": text,
            "source": "deterministic",
            "model": None,
            "generated_at": datetime.now(timezone.utc),
            "insights_considered": len(insights),
            "confidence": 0.6,
        }

    def _deterministic_narration_empty(
        self,
        bundle: dict[str, Any],
    ) -> dict[str, Any]:
        text = (
            "No operational signals are active. The workspace has no "
            "elevated risks the engine can describe right now."
        )
        return {
            "narration": text,
            "source": "deterministic",
            "model": None,
            "generated_at": datetime.now(timezone.utc),
            "insights_considered": 0,
            "confidence": 0.55,
        }

    # ----- Helpers -----

    @staticmethod
    def _grounded_in(bundle: dict[str, Any]) -> list[dict[str, str]]:
        items: list[dict[str, str]] = []

        for insight in bundle.get("insights", []) or []:
            title = insight.get("title")
            severity = insight.get("severity")
            if title and severity:
                items.append({"label": str(title), "detail": f"severity: {severity}"})

        for event in (bundle.get("history") or [])[:3]:
            event_type = event.get("type")
            trend = event.get("severity_trend")
            if event_type and trend:
                items.append({
                    "label": f"history: {event_type.replace('_', ' ')}",
                    "detail": f"trend: {trend} · ×{event.get('occurrence_count', 1)}",
                })

        return items[:6]

    @staticmethod
    def _state_label(tone: str) -> str:
        return {
            "healthy": "Healthy",
            "stable": "Stable",
            "watch": "Watch",
            "at_risk": "At Risk",
            "no_data": "No data",
        }.get(tone, "")

    @staticmethod
    def _headline_for(tone: str) -> str:
        return {
            "healthy": "Workspace operating within normal parameters",
            "stable": "Workspace stable with minor signals",
            "watch": "Operational signals worth watching",
            "at_risk": "Operational pressure is elevated",
            "no_data": "Briefing will appear after the first sync",
        }.get(tone, "Workspace briefing")

    # ----- Cache (process-local) -----

    @staticmethod
    def _fingerprint(bundle: dict[str, Any], kind: str) -> str:
        snapshot = {
            "kind": kind,
            "health": bundle.get("health"),
            "insights": [
                (i.get("type"), i.get("severity"), i.get("repository"))
                for i in (bundle.get("insights") or [])
            ],
            "history": [
                (e.get("type"), e.get("severity_trend"), e.get("occurrence_count"))
                for e in (bundle.get("history") or [])
            ],
        }
        payload = json.dumps(snapshot, sort_keys=True, default=str)
        return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:24]

    def _read_cache(self, key: str) -> dict[str, Any] | None:
        record = self._cache.get(key)
        if record is None:
            return None
        timestamp, payload = record
        if (time.monotonic() - timestamp) > CACHE_TTL_SECONDS:
            self._cache.pop(key, None)
            return None
        return payload

    def _write_cache(self, key: str, payload: dict[str, Any]) -> None:
        self._cache[key] = (time.monotonic(), payload)
        # Cap the cache modestly to avoid unbounded growth.
        if len(self._cache) > 256:
            oldest = sorted(self._cache.items(), key=lambda item: item[1][0])[:128]
            for old_key, _ in oldest:
                self._cache.pop(old_key, None)
