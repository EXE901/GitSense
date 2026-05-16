from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.insight_event import InsightEvent
from app.models.user import utc_now
from app.services.ownership_service import OwnershipContext


SIGNATURE_TYPES_WITH_REPO = {
    "inactive_repository",
    "low_engagement_repository",
    "repository_concentration",
    "discussion_hotspot",
    "single_repository_dominance",
}


class InsightHistoryService:
    """Persistence + retrieval of insight occurrence history.

    Records are keyed by an ownership scope + signature. A signature is
    derived from the insight type and (when relevant) the repository,
    NOT from the time-bucketed engine ID. This keeps recurrences
    aggregated into a single row instead of accumulating noise.
    """

    async def record_occurrences(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        insights: list[dict[str, Any]],
    ) -> None:
        if ownership_context is None:
            return

        if not ownership_context.user_id and not ownership_context.guest_session_id:
            return

        now = datetime.now(timezone.utc)

        for insight in insights:
            insight_type = insight.get("type")

            if not isinstance(insight_type, str) or insight_type == "workspace_healthy":
                continue

            signature = self._signature(insight)
            severity = str(insight.get("severity") or "info")
            title = str(insight.get("title") or "")[:200]
            repository_value = insight.get("repository")
            repository = str(repository_value)[:255] if repository_value else None

            existing = await self._find_existing(
                db,
                ownership_context,
                signature,
            )

            if existing is None:
                db.add(
                    InsightEvent(
                        user_id=ownership_context.user_id,
                        guest_session_id=ownership_context.guest_session_id,
                        signature=signature,
                        insight_type=insight_type,
                        repository=repository,
                        severity=severity,
                        first_severity=severity,
                        title=title,
                        occurrence_count=1,
                        first_seen_at=now,
                        last_seen_at=now,
                    )
                )
            else:
                existing.last_seen_at = now
                existing.occurrence_count = (existing.occurrence_count or 0) + 1
                existing.severity = severity
                if title:
                    existing.title = title

        await db.commit()

    async def list_history(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        limit: int = 25,
    ) -> dict[str, Any]:
        if ownership_context is None:
            return {"events": [], "total": 0, "generated_at": utc_now()}

        if not ownership_context.user_id and not ownership_context.guest_session_id:
            return {"events": [], "total": 0, "generated_at": utc_now()}

        query = select(InsightEvent)

        if ownership_context.user_id:
            query = query.where(InsightEvent.user_id == ownership_context.user_id)
        else:
            query = query.where(
                InsightEvent.guest_session_id == ownership_context.guest_session_id
            )

        query = query.order_by(InsightEvent.last_seen_at.desc()).limit(limit)

        result = await db.execute(query)
        events = result.scalars().all()

        return {
            "events": [self._serialize(event) for event in events],
            "total": len(events),
            "generated_at": utc_now(),
        }

    async def _find_existing(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext,
        signature: str,
    ) -> InsightEvent | None:
        query = select(InsightEvent).where(InsightEvent.signature == signature)

        if ownership_context.user_id:
            query = query.where(InsightEvent.user_id == ownership_context.user_id)
        else:
            query = query.where(
                InsightEvent.guest_session_id == ownership_context.guest_session_id
            )

        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def _signature(insight: dict[str, Any]) -> str:
        insight_type = str(insight.get("type") or "")
        repository = insight.get("repository") or ""

        if insight_type in SIGNATURE_TYPES_WITH_REPO and repository:
            payload = f"{insight_type}:{repository}"
        else:
            payload = insight_type

        return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:24]

    @staticmethod
    def _serialize(event: InsightEvent) -> dict[str, Any]:
        severity_trend = "flat"

        severity_order = {"info": 0, "low": 1, "medium": 2, "high": 3}
        current = severity_order.get(event.severity, 0)
        first = severity_order.get(event.first_severity, 0)

        if current > first:
            severity_trend = "worsening"
        elif current < first:
            severity_trend = "improving"

        return {
            "id": str(event.id),
            "signature": event.signature,
            "type": event.insight_type,
            "repository": event.repository,
            "severity": event.severity,
            "first_severity": event.first_severity,
            "severity_trend": severity_trend,
            "title": event.title,
            "occurrence_count": event.occurrence_count,
            "first_seen_at": event.first_seen_at.isoformat(),
            "last_seen_at": event.last_seen_at.isoformat(),
        }
