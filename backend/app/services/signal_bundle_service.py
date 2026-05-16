from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.health_service import HealthService
from app.services.insight_engine import InsightEngine
from app.services.insight_history_service import InsightHistoryService
from app.services.ownership_service import OwnershipContext


class SignalBundleService:
    """Builds a compact, structured snapshot of deterministic signals
    that the AI narration layer is allowed to consume.

    The bundle never contains raw issue bodies, comments, or other
    free-form content from the database. Only:
      - workspace health summary
      - top per-repo health
      - the engine's current insight set (titles + severities)
      - history events with recurrence + severity_trend

    This keeps the prompt small, predictable, and impossible to
    use as a vector for exfiltrating user content.
    """

    def __init__(
        self,
        insight_engine: InsightEngine,
        health_service: HealthService,
        insight_history_service: InsightHistoryService,
    ) -> None:
        self._insights = insight_engine
        self._health = health_service
        self._history = insight_history_service

    async def build(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        repo: str | None = None,
    ) -> dict[str, Any]:
        engine_result = await self._insights.generate_workspace_insights(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )
        health_result = await self._health.get_workspace_health(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )
        history_result = await self._history.list_history(
            db=db,
            ownership_context=ownership_context,
            limit=10,
        )

        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "workspace_repositories": engine_result.get("workspace_repositories", 0),
            "indexed_issues": engine_result.get("indexed_issues", 0),
            "health": self._compact_health(health_result),
            "insights": self._compact_insights(engine_result.get("insights", [])),
            "history": self._compact_history(history_result.get("events", [])),
        }

    @staticmethod
    def _compact_health(payload: dict[str, Any]) -> dict[str, Any]:
        workspace = payload.get("workspace", {}) or {}
        repos = payload.get("repositories", []) or []

        return {
            "workspace_state": workspace.get("state"),
            "workspace_score": workspace.get("score"),
            "average_score": workspace.get("average_score"),
            "worst_score": workspace.get("worst_score"),
            "state_counts": workspace.get("state_counts"),
            "primary_concern": workspace.get("primary_concern_label"),
            "contributor_concentration": (
                workspace.get("contributor_imbalance", {}).get("top_share")
            ),
            "top_concentration_repository": (
                workspace.get("contributor_imbalance", {}).get("top_repository")
            ),
            "repositories": [
                {
                    "repository": item.get("repository"),
                    "state": item.get("state"),
                    "score": item.get("score"),
                    "top_signal": (
                        item.get("rationale", [{}])[0].get("key")
                        if item.get("rationale") else None
                    ),
                }
                for item in repos[:6]
            ],
        }

    @staticmethod
    def _compact_insights(insights: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "type": insight.get("type"),
                "severity": insight.get("severity"),
                "title": insight.get("title"),
                "repository": insight.get("repository"),
                "trend": insight.get("trend"),
            }
            for insight in insights[:8]
        ]

    @staticmethod
    def _compact_history(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "type": event.get("type"),
                "severity": event.get("severity"),
                "severity_trend": event.get("severity_trend"),
                "occurrence_count": event.get("occurrence_count"),
                "first_seen_at": event.get("first_seen_at"),
                "last_seen_at": event.get("last_seen_at"),
                "repository": event.get("repository"),
            }
            for event in events[:8]
        ]
