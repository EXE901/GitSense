from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.services.analytics_service import AnalyticsService
from app.services.ownership_service import OwnershipContext


STALE_THRESHOLD_DAYS = 14
RECENT_WINDOW_DAYS = 7


class HeatmapService:
    """Operational density data for repository-level heatmap views.

    Each cell describes one repository's activity, stale pressure, and
    open-issue load. Intensity is normalized to a 0-1 scale per metric
    so the frontend can render comparable shading without re-doing
    the math.
    """

    def __init__(self, analytics_service: AnalyticsService | None = None) -> None:
        self._analytics = analytics_service or AnalyticsService()

    async def get_activity_heatmap(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        repo: str | None = None,
    ) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        repositories = await self._analytics._get_owned_repositories(
            db, ownership_context, repo
        )
        repository_ids = [r.id for r in repositories]

        if not repositories or not repository_ids:
            return {
                "cells": [],
                "totals": {
                    "repositories": 0,
                    "indexed_issues": 0,
                    "stale_open": 0,
                    "recent_activity": 0,
                },
                "max": {
                    "open_issues": 0,
                    "recent_activity": 0,
                    "stale_open": 0,
                },
                "generated_at": now.isoformat(),
            }

        issues = await self._analytics._get_repository_issues(db, repository_ids)

        stale_cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)
        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)

        cells: list[dict[str, Any]] = []
        for repository in repositories:
            repo_issues = [i for i in issues if i.repository_name == repository.full_name]
            open_issues = [i for i in repo_issues if i.state == "open"]
            stale_open = [i for i in open_issues if i.updated_at < stale_cutoff]
            recent_activity = [
                i for i in repo_issues if i.updated_at >= recent_cutoff
            ]

            cells.append({
                "repository": repository.full_name,
                "open_issues": len(open_issues),
                "closed_issues": len([i for i in repo_issues if i.state == "closed"]),
                "stale_open": len(stale_open),
                "recent_activity": len(recent_activity),
                "indexed_issues": len(repo_issues),
                "last_synced_at": (
                    repository.last_synced_at.isoformat()
                    if repository.last_synced_at else None
                ),
            })

        max_open = max((cell["open_issues"] for cell in cells), default=0)
        max_recent = max((cell["recent_activity"] for cell in cells), default=0)
        max_stale = max((cell["stale_open"] for cell in cells), default=0)

        for cell in cells:
            cell["intensity"] = {
                "activity": _normalize(cell["recent_activity"], max_recent),
                "stale": _normalize(cell["stale_open"], max_stale),
                "load": _normalize(cell["open_issues"], max_open),
            }

        cells.sort(key=lambda c: (c["recent_activity"], c["open_issues"]), reverse=True)

        return {
            "cells": cells,
            "totals": {
                "repositories": len(repositories),
                "indexed_issues": sum(c["indexed_issues"] for c in cells),
                "stale_open": sum(c["stale_open"] for c in cells),
                "recent_activity": sum(c["recent_activity"] for c in cells),
            },
            "max": {
                "open_issues": max_open,
                "recent_activity": max_recent,
                "stale_open": max_stale,
            },
            "generated_at": now.isoformat(),
        }


def _normalize(value: int, ceiling: int) -> float:
    if ceiling <= 0:
        return 0.0
    return round(min(1.0, value / ceiling), 3)
