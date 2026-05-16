from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.models.repository import Repository
from app.services.analytics_service import AnalyticsService
from app.services.ownership_service import OwnershipContext


STALE_THRESHOLD_DAYS = 14
INACTIVE_REPOSITORY_DAYS = 30
RECENT_WINDOW_DAYS = 7

HEALTHY_THRESHOLD = 80
STABLE_THRESHOLD = 60
WATCH_THRESHOLD = 40


class HealthService:
    """Deterministic, weighted, explainable repository + workspace health.

    Health derives strictly from existing analytics signals. The output
    is one of four states (Healthy / Stable / Watch / At Risk) with a
    numeric score, the underlying signal weights, and a list of
    machine-readable rationale items the UI can render.
    """

    def __init__(self, analytics_service: AnalyticsService | None = None) -> None:
        self._analytics = analytics_service or AnalyticsService()

    async def get_workspace_health(
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
                "workspace": self._empty_workspace_summary(now),
                "repositories": [],
                "generated_at": now,
            }

        issues = await self._analytics._get_repository_issues(db, repository_ids)

        repo_health = [
            self._evaluate_repository_health(repository, issues, now)
            for repository in repositories
        ]

        workspace = self._aggregate_workspace_health(repo_health, repositories, issues, now)

        return {
            "workspace": workspace,
            "repositories": repo_health,
            "generated_at": now,
        }

    def _evaluate_repository_health(
        self,
        repository: Repository,
        all_issues: list[Issue],
        now: datetime,
    ) -> dict[str, Any]:
        repo_issues = [i for i in all_issues if i.repository_name == repository.full_name]
        open_issues = [i for i in repo_issues if i.state == "open"]
        closed_issues = [i for i in repo_issues if i.state == "closed"]

        stale_cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)
        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)
        previous_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS * 2)
        inactive_cutoff = now - timedelta(days=INACTIVE_REPOSITORY_DAYS)

        stale_open = [i for i in open_issues if i.updated_at < stale_cutoff]
        recent_opened = [i for i in repo_issues if i.created_at >= recent_cutoff]
        previous_opened = [
            i for i in repo_issues
            if previous_cutoff <= i.created_at < recent_cutoff
        ]
        recent_closed = sum(
            1 for i in repo_issues
            if i.state == "closed" and i.updated_at >= recent_cutoff
        )
        unlabeled_open = [i for i in open_issues if not i.labels]
        latest_activity = max(
            (i.updated_at for i in repo_issues),
            default=repository.last_synced_at,
        )

        signals: list[dict[str, Any]] = []
        deductions = 0

        # Signal 1: stale issue accumulation (weight up to 22)
        if open_issues:
            stale_ratio = len(stale_open) / len(open_issues)
            if stale_ratio >= 0.6:
                deductions += 22
                signals.append(self._signal(
                    "stale_pressure",
                    "negative",
                    f"{len(stale_open)} of {len(open_issues)} open issues stale "
                    f"(>{STALE_THRESHOLD_DAYS}d) — {stale_ratio * 100:.0f}%.",
                    weight=22,
                ))
            elif stale_ratio >= 0.4:
                deductions += 13
                signals.append(self._signal(
                    "stale_pressure",
                    "negative",
                    f"{len(stale_open)} stale open issues ({stale_ratio * 100:.0f}%).",
                    weight=13,
                ))
            elif stale_ratio >= 0.25:
                deductions += 6
                signals.append(self._signal(
                    "stale_pressure",
                    "watch",
                    f"Stale share trending up ({stale_ratio * 100:.0f}%).",
                    weight=6,
                ))

        # Signal 2: backlog growth (weight up to 18)
        if len(recent_opened) >= 5 and recent_closed < len(recent_opened):
            gap = len(recent_opened) - recent_closed
            gap_ratio = gap / max(len(recent_opened), 1)
            if gap_ratio >= 0.7:
                deductions += 18
                signals.append(self._signal(
                    "backlog_growth",
                    "negative",
                    f"Backlog grew by {gap} this week ({len(recent_opened)} opened "
                    f"vs {recent_closed} closed).",
                    weight=18,
                ))
            elif gap_ratio >= 0.4:
                deductions += 10
                signals.append(self._signal(
                    "backlog_growth",
                    "watch",
                    f"Opens outpaced closes by {gap} this week.",
                    weight=10,
                ))

        # Signal 3: throughput / open-closed ratio (weight up to 14)
        total_open = repository.open_issues_count or len(open_issues)
        total_closed = repository.closed_issues_count or len(closed_issues)
        if total_closed > 0 and total_open > 0:
            ratio = total_open / total_closed
            if ratio >= 6:
                deductions += 14
                signals.append(self._signal(
                    "throughput",
                    "negative",
                    f"Open issues are {ratio:.1f}× closed — closure rate is low.",
                    weight=14,
                ))
            elif ratio >= 3:
                deductions += 7
                signals.append(self._signal(
                    "throughput",
                    "watch",
                    f"Open issues are {ratio:.1f}× closed.",
                    weight=7,
                ))

        # Signal 4: unlabeled backlog (weight up to 10)
        if open_issues:
            unlabeled_ratio = len(unlabeled_open) / len(open_issues)
            if unlabeled_ratio >= 0.6:
                deductions += 10
                signals.append(self._signal(
                    "unlabeled_backlog",
                    "watch",
                    f"{unlabeled_ratio * 100:.0f}% of open issues have no labels.",
                    weight=10,
                ))
            elif unlabeled_ratio >= 0.4:
                deductions += 5
                signals.append(self._signal(
                    "unlabeled_backlog",
                    "watch",
                    f"{unlabeled_ratio * 100:.0f}% of open issues are unlabeled.",
                    weight=5,
                ))

        # Signal 5: activity drop (weight up to 12)
        if previous_opened and len(recent_opened) < len(previous_opened):
            drop_ratio = (len(previous_opened) - len(recent_opened)) / len(previous_opened)
            if drop_ratio >= 0.6:
                deductions += 12
                signals.append(self._signal(
                    "activity_drop",
                    "watch",
                    f"Recent activity down {drop_ratio * 100:.0f}% vs last week.",
                    weight=12,
                ))

        # Signal 6: maintenance recency (weight up to 16)
        if latest_activity is None:
            deductions += 8
            signals.append(self._signal(
                "maintenance_recency",
                "watch",
                "No indexed activity yet.",
                weight=8,
            ))
        elif latest_activity < inactive_cutoff:
            days_silent = max((now - latest_activity).days, 0)
            if days_silent >= 90:
                deductions += 16
                signals.append(self._signal(
                    "maintenance_recency",
                    "negative",
                    f"No activity for {days_silent}d.",
                    weight=16,
                ))
            else:
                deductions += 10
                signals.append(self._signal(
                    "maintenance_recency",
                    "watch",
                    f"No activity for {days_silent}d.",
                    weight=10,
                ))

        # Signal 7: low engagement (weight up to 6)
        if len(open_issues) >= 10:
            avg_comments = sum(i.comments_count for i in repo_issues) / max(len(repo_issues), 1)
            if avg_comments < 0.8:
                deductions += 6
                signals.append(self._signal(
                    "engagement",
                    "watch",
                    f"Avg {avg_comments:.1f} comments per issue with "
                    f"{len(open_issues)} open issues.",
                    weight=6,
                ))

        # Positive baseline signal
        if not signals:
            signals.append(self._signal(
                "baseline",
                "positive",
                "No elevated risks detected from indexed activity.",
                weight=0,
            ))

        score = max(0, min(100, 100 - deductions))
        state = self._classify_state(score)
        confidence = self._confidence_for(len(repo_issues))

        return {
            "repository": repository.full_name,
            "score": score,
            "state": state,
            "indexed_issues": len(repo_issues),
            "open_issues": len(open_issues),
            "closed_issues": len(closed_issues),
            "stale_open_issues": len(stale_open),
            "confidence": confidence,
            "rationale": signals,
            "last_activity_at": (
                latest_activity.isoformat()
                if isinstance(latest_activity, datetime)
                else None
            ),
        }

    def _aggregate_workspace_health(
        self,
        repo_health: list[dict[str, Any]],
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> dict[str, Any]:
        if not repo_health:
            return self._empty_workspace_summary(now)

        average_score = sum(item["score"] for item in repo_health) / len(repo_health)
        worst_score = min(item["score"] for item in repo_health)
        # Workspace score is biased toward the worst repo so one
        # at-risk repo does not get hidden by healthier neighbours.
        score = round((average_score * 0.6) + (worst_score * 0.4))
        state = self._classify_state(score)

        state_counts: dict[str, int] = {"healthy": 0, "stable": 0, "watch": 0, "at_risk": 0}
        for item in repo_health:
            state_counts[item["state"]] = state_counts.get(item["state"], 0) + 1

        top_signals: dict[str, int] = {}
        for item in repo_health:
            for signal in item["rationale"]:
                key = signal["key"]
                if signal["tone"] == "negative":
                    top_signals[key] = top_signals.get(key, 0) + signal["weight"] * 2
                elif signal["tone"] == "watch":
                    top_signals[key] = top_signals.get(key, 0) + signal["weight"]

        ranked_signals = sorted(top_signals.items(), key=lambda pair: pair[1], reverse=True)
        primary_signal = ranked_signals[0][0] if ranked_signals else None

        contributor_imbalance = self._contributor_distribution(issues)

        return {
            "score": score,
            "state": state,
            "average_score": round(average_score),
            "worst_score": worst_score,
            "repository_count": len(repositories),
            "indexed_issues": len(issues),
            "state_counts": state_counts,
            "primary_concern": primary_signal,
            "primary_concern_label": self._signal_label(primary_signal),
            "contributor_imbalance": contributor_imbalance,
            "generated_at": now.isoformat(),
        }

    @staticmethod
    def _signal(
        key: str,
        tone: str,
        message: str,
        weight: int,
    ) -> dict[str, Any]:
        return {
            "key": key,
            "tone": tone,
            "message": message,
            "weight": weight,
        }

    @staticmethod
    def _classify_state(score: int) -> str:
        if score >= HEALTHY_THRESHOLD:
            return "healthy"
        if score >= STABLE_THRESHOLD:
            return "stable"
        if score >= WATCH_THRESHOLD:
            return "watch"
        return "at_risk"

    @staticmethod
    def _confidence_for(sample_size: int) -> float:
        if sample_size >= 100:
            return 0.9
        if sample_size >= 40:
            return 0.8
        if sample_size >= 15:
            return 0.7
        if sample_size >= 5:
            return 0.6
        return 0.5

    @staticmethod
    def _signal_label(key: str | None) -> str | None:
        labels = {
            "stale_pressure": "Stale backlog pressure",
            "backlog_growth": "Backlog growth",
            "throughput": "Throughput gap",
            "unlabeled_backlog": "Triage signal missing",
            "activity_drop": "Activity drop",
            "maintenance_recency": "Maintenance recency",
            "engagement": "Low engagement",
            "single_repository_dominance": "Repository concentration",
        }
        if key is None:
            return None
        return labels.get(key, key.replace("_", " ").title())

    @staticmethod
    def _contributor_distribution(issues: list[Issue]) -> dict[str, Any]:
        # Without per-author data in the schema, contributor risk is
        # proxied by repository activity concentration — the
        # bus-factor-style signal we can defensibly produce.
        if not issues:
            return {
                "available": False,
                "top_repository": None,
                "top_share": 0.0,
                "repository_breakdown": [],
            }

        counts: dict[str, int] = {}
        for issue in issues:
            counts[issue.repository_name] = counts.get(issue.repository_name, 0) + 1

        total = sum(counts.values()) or 1
        breakdown = sorted(
            [
                {"repository": repo, "share": round(count / total, 3), "issue_count": count}
                for repo, count in counts.items()
            ],
            key=lambda item: item["share"],
            reverse=True,
        )

        top_repo = breakdown[0]
        return {
            "available": True,
            "top_repository": top_repo["repository"],
            "top_share": top_repo["share"],
            "repository_breakdown": breakdown,
        }

    @staticmethod
    def _empty_workspace_summary(now: datetime) -> dict[str, Any]:
        return {
            "score": 0,
            "state": "no_data",
            "average_score": 0,
            "worst_score": 0,
            "repository_count": 0,
            "indexed_issues": 0,
            "state_counts": {"healthy": 0, "stable": 0, "watch": 0, "at_risk": 0},
            "primary_concern": None,
            "primary_concern_label": None,
            "contributor_imbalance": {
                "available": False,
                "top_repository": None,
                "top_share": 0.0,
                "repository_breakdown": [],
            },
            "generated_at": now.isoformat(),
        }
