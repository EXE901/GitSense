from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
import unicodedata
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


# Timeouts tuned for OpenRouter free-tier latency spikes.
# The SDK timeout is the inner attempt; the outer asyncio
# boundary is the unconditional safety net.
AI_NARRATION_SDK_TIMEOUT_SECONDS = 20.0
AI_NARRATION_HARD_TIMEOUT_SECONDS = 22.0
AI_NARRATION_MAX_TOKENS = 240
AI_NARRATION_TEMPERATURE = 0.15
CACHE_TTL_SECONDS = 90

# Sanitization / validation bounds for provider output.
MIN_ACCEPTABLE_OUTPUT_CHARS = 60
MAX_ACCEPTABLE_OUTPUT_CHARS = 1400
MIN_ACCEPTABLE_SENTENCES = 2
MAX_ACCEPTABLE_SENTENCES = 8
MAX_NON_ASCII_RATIO = 0.05
MAX_SYMBOL_RATIO = 0.08
MIN_LATIN_LETTER_RATIO = 0.55

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_DEFAULT_MODEL = "deepseek/deepseek-v4-flash:free"

OPENROUTER_REFERER = os.getenv("OPENROUTER_REFERER", "https://gitsense.tech")
OPENROUTER_APP_TITLE = os.getenv("OPENROUTER_APP_TITLE", "GitSense")


SYSTEM_PROMPT = (
    "You are GitSense's operational briefing writer. You write dense, "
    "restrained, English-only operational summaries of a GitHub workspace "
    "for senior engineers. You are not a chatbot.\n\n"
    "OUTPUT FORMAT (strict):\n"
    "- 3 to 5 sentences of plain English prose. No more.\n"
    "- No bullet lists, headers, code, markdown, emojis, or labels.\n"
    "- No preamble, no closing, no quoting the input, no JSON.\n"
    "- Do not restate these instructions. Do not mention the bundle.\n"
    "- English only. Do not switch language under any condition.\n\n"
    "CONTENT RULES:\n"
    "1. Only describe signals present in the provided JSON. Never invent "
    "metrics, percentages, dates, repositories, contributors, or causes.\n"
    "2. Use observational phrasing: 'persisting', 'concentrated in', "
    "'has not improved', 'continues to widen', 'unchanged since'.\n"
    "3. Lead with the dominant operational pressure. Mention secondary "
    "signals only if they reinforce the primary one.\n"
    "4. Reference concrete signal types (stale backlog, throughput gap, "
    "contributor concentration, recurrence trend), not generic terms.\n"
    "5. If the workspace is healthy, acknowledge it in 2 sentences and "
    "stop. Do not pad. Do not invent risks.\n"
    "6. Do not address the reader. No 'you', 'we', 'consider', "
    "'recommend', 'best practices', marketing language, or rhetorical "
    "questions.\n"
    "7. Output prose only. The first character must be a capital letter. "
    "The final character must be a period."
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

        cleaned = _sanitize_provider_output(content)
        if cleaned is None:
            logger.warning(
                "AI provider output failed validation; "
                "falling back deterministically."
            )
            return None
        return cleaned

    # ----- Prompt builders -----

    @classmethod
    def _build_briefing_user_prompt(cls, bundle: dict[str, Any]) -> str:
        compact = json.dumps(
            cls._prompt_bundle(bundle, kind="briefing"),
            separators=(",", ":"),
            default=str,
        )
        return (
            "Write a workspace operational briefing grounded only in the "
            "JSON below. 3 to 5 sentences. English only. No lists, no "
            "headers, no code, no markdown. Do not quote the JSON. Do not "
            "restate these instructions. Do not include numbers unless "
            "they appear in the JSON.\n\n"
            f"JSON:\n{compact}"
        )

    @classmethod
    def _build_narration_user_prompt(cls, bundle: dict[str, Any]) -> str:
        compact = json.dumps(
            cls._prompt_bundle(bundle, kind="narration"),
            separators=(",", ":"),
            default=str,
        )
        return (
            "Narrate the active operational insight set in 2 to 4 "
            "sentences. English only. Plain prose. Only describe signals "
            "present in the JSON. Do not invent causes or recommend "
            "generic optimizations.\n\n"
            f"JSON:\n{compact}"
        )

    @staticmethod
    def _prompt_bundle(bundle: dict[str, Any], kind: str) -> dict[str, Any]:
        """Compact, prompt-safe projection of the signal bundle.

        Only fields the AI is allowed to narrate are included. Free-form
        strings are length-capped. Lists are bounded. This keeps the
        prompt token count low and removes anything the model could
        latch onto and hallucinate around.
        """
        health = bundle.get("health") or {}
        insights = bundle.get("insights") or []
        history = bundle.get("history") or []

        compact: dict[str, Any] = {
            "workspace_repositories": bundle.get("workspace_repositories", 0),
            "indexed_issues": bundle.get("indexed_issues", 0),
            "health": {
                "workspace_state": health.get("workspace_state"),
                "workspace_score": health.get("workspace_score"),
                "primary_concern": _cap_text(health.get("primary_concern"), 80),
                "contributor_concentration": health.get("contributor_concentration"),
                "top_concentration_repository": _cap_text(
                    health.get("top_concentration_repository"), 80
                ),
            },
            "insights": [
                {
                    "type": insight.get("type"),
                    "severity": insight.get("severity"),
                    "title": _cap_text(insight.get("title"), 120),
                    "repository": _cap_text(insight.get("repository"), 80),
                    "trend": insight.get("trend"),
                }
                for insight in insights[:6]
            ],
        }

        if kind == "briefing":
            compact["history"] = [
                {
                    "type": event.get("type"),
                    "severity_trend": event.get("severity_trend"),
                    "occurrence_count": event.get("occurrence_count"),
                }
                for event in history[:5]
            ]

        return compact

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


# ----- Module-level helpers (output sanitization) -----


_PROMPT_LEAKAGE_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(pattern, re.IGNORECASE) for pattern in (
        r"\bexactly as shown below\b",
        r"\bexactly as (?:asked|requested|stated)\b",
        r"\bas an? (?:ai|language model|assistant)\b",
        r"\bi am an? (?:ai|language model|assistant)\b",
        r"\bsystem prompt\b",
        r"\boutput format\b",
        r"\bjson bundle\b",
        r"\bcontent rules?\b",
        r"\bobservational phrasing\b",
        r"```",
        r"^\s*\{",
    )
)


_BANNED_PHRASES: tuple[str, ...] = (
    "as an ai",
    "as a language model",
    "i cannot",
    "i can't",
    "sorry, i",
    "here is",
    "here's the",
    "let me",
)


def _cap_text(value: Any, limit: int) -> Any:
    """Length-cap a free-form string field so it cannot dominate
    the prompt or leak large user-controlled content into the
    context window."""
    if value is None or not isinstance(value, str):
        return value
    if len(value) <= limit:
        return value
    return value[: max(1, limit - 1)].rstrip() + "…"


def _strip_code_fences(text: str) -> str:
    return re.sub(r"```+[a-zA-Z]*\n?", "", text).replace("```", "")


def _normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def _count_sentences(text: str) -> int:
    # Heuristic: count terminal punctuation followed by space/end.
    return len(re.findall(r"[.!?](?:\s|$)", text))


def _sanitize_provider_output(content: str) -> str | None:
    """Validate + clean raw provider output.

    Returns the sanitized prose if it passes every guard, or None
    to indicate the caller should fall back deterministically.

    Guards (in order):
      1. Unicode-normalize, strip BOMs / zero-width chars.
      2. Strip markdown fences and surrounding noise.
      3. Hard length bounds.
      4. Reject non-English / non-Latin scripts.
      5. Reject excessive symbol/punctuation noise.
      6. Reject prompt-leakage and instruction echoes.
      7. Reject conversational chatbot openers.
      8. Reject obvious n-gram repetition (looping output).
      9. Reject if sentence count is outside the expected range.
    """
    if not isinstance(content, str):
        return None

    text = unicodedata.normalize("NFKC", content)
    text = text.replace("\ufeff", "")  # BOM
    text = re.sub(r"[\u200b\u200c\u200d\u2060]", "", text)  # zero-width
    text = _strip_code_fences(text)
    text = _normalize_whitespace(text)

    if not text:
        return None

    # Strip leading conversational openers and chatbot scaffolding.
    text = re.sub(
        r"^(?:sure|certainly|absolutely|of course|alright|okay)[!,.\s]*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    text = re.sub(
        r"^(?:here(?:'s| is)|here are)\s+(?:your\s+|the\s+|a\s+)?"
        r"(?:briefing|summary|operational\s+(?:briefing|summary))"
        r"[:.,\s\-—]*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()

    if len(text) < MIN_ACCEPTABLE_OUTPUT_CHARS:
        return None
    if len(text) > MAX_ACCEPTABLE_OUTPUT_CHARS:
        text = text[:MAX_ACCEPTABLE_OUTPUT_CHARS].rstrip()
        # Trim back to the last full sentence if we truncated mid-stream.
        match = re.search(r"[.!?][^.!?]*$", text)
        if match and match.start() > 0:
            text = text[: match.start() + 1]

    # Multilingual / script-purity guard.
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return None

    non_ascii_letters = [c for c in letters if ord(c) > 127]
    if len(non_ascii_letters) / len(letters) > MAX_NON_ASCII_RATIO:
        return None

    # Reject if the model started writing in a non-Latin script
    # (Cyrillic, CJK, Arabic, Devanagari, etc.) — common DeepSeek
    # free-tier failure mode.
    for ch in letters:
        name = ""
        try:
            name = unicodedata.name(ch, "")
        except ValueError:
            name = ""
        if name and (
            "CJK" in name
            or "HIRAGANA" in name
            or "KATAKANA" in name
            or "HANGUL" in name
            or "CYRILLIC" in name
            or "ARABIC" in name
            or "DEVANAGARI" in name
            or "HEBREW" in name
            or "THAI" in name
        ):
            return None

    # Latin-letter ratio guard (rejects symbol-spam responses).
    total = len(text)
    latin_letters = sum(1 for c in text if c.isalpha() and ord(c) < 128)
    if latin_letters / total < MIN_LATIN_LETTER_RATIO:
        return None

    symbol_chars = sum(
        1
        for c in text
        if not c.isalnum() and not c.isspace() and c not in ".,;:'\"-()/%"
    )
    if symbol_chars / total > MAX_SYMBOL_RATIO:
        return None

    lowered = text.lower()
    for phrase in _BANNED_PHRASES:
        if phrase in lowered:
            return None

    for pattern in _PROMPT_LEAKAGE_PATTERNS:
        if pattern.search(text):
            return None

    # Repetition guard: looped n-grams are a common free-tier failure.
    words = re.findall(r"[A-Za-z][A-Za-z'\-]+", text)
    if len(words) >= 12:
        trigrams = [
            " ".join(words[i : i + 3]).lower()
            for i in range(len(words) - 2)
        ]
        if trigrams:
            most_common_count = max(trigrams.count(tg) for tg in set(trigrams))
            if most_common_count >= 3:
                return None

    # Sentence-count guard.
    sentences = _count_sentences(text)
    if sentences < MIN_ACCEPTABLE_SENTENCES:
        return None
    if sentences > MAX_ACCEPTABLE_SENTENCES:
        # Trim to the first MAX_ACCEPTABLE_SENTENCES sentences.
        cut = 0
        seen = 0
        for match in re.finditer(r"[.!?](?:\s|$)", text):
            seen += 1
            cut = match.end()
            if seen >= MAX_ACCEPTABLE_SENTENCES:
                break
        if cut:
            text = text[:cut].rstrip()

    # Final shape requirements.
    if not text or not text[0].isalpha() or not text[0].isupper():
        return None
    if text[-1] not in ".!?":
        text = text.rstrip() + "."

    return text
