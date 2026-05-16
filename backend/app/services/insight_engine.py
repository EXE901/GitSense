from __future__ import annotations

import hashlib
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
PREVIOUS_WINDOW_DAYS = 7
BUG_LABEL_SPIKE_RATIO = 0.30
HIGH_OPEN_RATIO_THRESHOLD = 3.0
UNLABELED_BACKLOG_THRESHOLD = 0.40
REPOSITORY_CONCENTRATION_THRESHOLD = 0.65
DISCUSSION_HOTSPOT_COMMENT_THRESHOLD = 25
MIN_ISSUES_FOR_STABLE_INSIGHT = 5
MAX_INSIGHTS = 12

BUG_LABEL_KEYWORDS = ("bug", "defect", "regression", "crash", "broken")


class InsightEngine:
    """Rule-based engineering insight generator.

    The engine reuses analytics data already exposed by ``AnalyticsService``
    and applies bounded thresholds to derive structured, operational
    insights. No external network calls, no LLMs. Deterministic per inputs.
    """

    def __init__(self, analytics_service: AnalyticsService | None = None) -> None:
        self._analytics = analytics_service or AnalyticsService()

    async def generate_workspace_insights(
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

        if not repository_ids:
            return {
                "insights": [],
                "generated_at": now,
                "workspace_repositories": 0,
                "indexed_issues": 0,
            }

        issues = await self._analytics._get_repository_issues(db, repository_ids)
        insights: list[dict[str, Any]] = []

        insights.extend(self._stale_issue_growth(issues, now))
        insights.extend(self._high_open_ratio(repositories, issues, now))
        insights.extend(self._bug_label_spike(issues, now))
        insights.extend(self._unlabeled_backlog(issues, now))
        insights.extend(self._inactive_repositories(repositories, issues, now))
        insights.extend(self._repository_concentration(repositories, issues, now))
        insights.extend(self._issue_volume_spike(issues, now))
        insights.extend(self._activity_drop(issues, now))
        insights.extend(self._low_engagement_repository(repositories, issues, now))
        insights.extend(self._backlog_growth(issues, now))
        insights.extend(self._discussion_hotspots(issues, now))
        insights.extend(self._contributor_load_imbalance(repositories, issues, now))

        insights = self._rank_and_trim(insights)

        if not insights:
            insights = [self._healthy_workspace_insight(repositories, issues, now)]

        return {
            "insights": insights,
            "generated_at": now,
            "workspace_repositories": len(repositories),
            "indexed_issues": len(issues),
        }

    def _rank_and_trim(self, insights: list[dict[str, Any]]) -> list[dict[str, Any]]:
        severity_weight = {"high": 3, "medium": 2, "low": 1, "info": 0}
        return sorted(
            insights,
            key=lambda item: (
                severity_weight.get(item["severity"], 0),
                item["confidence"],
            ),
            reverse=True,
        )[:MAX_INSIGHTS]

    def _stale_issue_growth(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        if len(issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        stale_cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)
        open_issues = [i for i in issues if i.state == "open"]

        if not open_issues:
            return []

        stale_open = [i for i in open_issues if i.updated_at < stale_cutoff]
        stale_ratio = len(stale_open) / len(open_issues)

        if stale_ratio < 0.25:
            return []

        if stale_ratio >= 0.6:
            severity = "high"
        elif stale_ratio >= 0.4:
            severity = "medium"
        else:
            severity = "low"

        return [
            {
                "id": self._make_id("stale", len(stale_open), now),
                "type": "stale_issue_growth",
                "severity": severity,
                "title": "Stale issues are accumulating",
                "description": (
                    f"{len(stale_open)} open issues ({stale_ratio * 100:.0f}% of open work) "
                    f"have not been updated in over {STALE_THRESHOLD_DAYS} days."
                ),
                "recommendation": (
                    "Schedule a triage pass on the oldest open issues "
                    "and either close, label, or assign them."
                ),
                "repository": None,
                "trend": "up",
                "confidence": min(0.5 + stale_ratio * 0.5, 0.95),
                "metrics": [
                    {"label": "Stale open", "value": str(len(stale_open))},
                    {"label": "Share of open", "value": f"{stale_ratio * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _high_open_ratio(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> list[dict[str, Any]]:
        total_open = sum(r.open_issues_count for r in repositories) or len(
            [i for i in issues if i.state == "open"]
        )
        total_closed = sum(r.closed_issues_count for r in repositories) or len(
            [i for i in issues if i.state == "closed"]
        )

        if total_closed == 0 or total_open == 0:
            return []

        ratio = total_open / total_closed

        if ratio < HIGH_OPEN_RATIO_THRESHOLD:
            return []

        severity = "high" if ratio >= 6 else "medium"

        return [
            {
                "id": self._make_id("open_ratio", int(ratio * 100), now),
                "type": "high_open_ratio",
                "severity": severity,
                "title": "Open issues outpacing closures",
                "description": (
                    f"There are {ratio:.1f}× more open issues than closed across the workspace. "
                    "Throughput may not be keeping up with intake."
                ),
                "recommendation": (
                    "Review intake rate vs. closure rate and consider a focused "
                    "bug-bash or backlog reduction sprint."
                ),
                "repository": None,
                "trend": "up",
                "confidence": min(0.55 + (ratio / 20), 0.9),
                "metrics": [
                    {"label": "Open : Closed", "value": f"{ratio:.1f}"},
                    {"label": "Open issues", "value": str(total_open)},
                ],
                "created_at": now,
            }
        ]

    def _bug_label_spike(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        if len(issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)
        previous_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS + PREVIOUS_WINDOW_DAYS)

        def is_bug(issue: Issue) -> bool:
            for label in issue.labels:
                lowered = str(label).lower()
                if any(keyword in lowered for keyword in BUG_LABEL_KEYWORDS):
                    return True
            return False

        recent = [i for i in issues if i.created_at >= recent_cutoff]
        previous = [
            i for i in issues
            if previous_cutoff <= i.created_at < recent_cutoff
        ]

        recent_bugs = sum(1 for i in recent if is_bug(i))
        previous_bugs = sum(1 for i in previous if is_bug(i))

        if recent_bugs < 3:
            return []

        if previous_bugs == 0:
            growth = 1.0
        else:
            growth = (recent_bugs - previous_bugs) / previous_bugs

        if growth < BUG_LABEL_SPIKE_RATIO:
            return []

        severity = "high" if growth >= 1.0 else "medium"

        return [
            {
                "id": self._make_id("bug_spike", recent_bugs, now),
                "type": "bug_label_spike",
                "severity": severity,
                "title": "Bug reports trending upward",
                "description": (
                    f"{recent_bugs} bug-labeled issues were opened in the last "
                    f"{RECENT_WINDOW_DAYS} days — a {growth * 100:.0f}% change "
                    f"from the prior {PREVIOUS_WINDOW_DAYS}-day window."
                ),
                "recommendation": (
                    "Investigate root cause for the new bug surface area. "
                    "Recent release or dependency change is a likely driver."
                ),
                "repository": None,
                "trend": "up",
                "confidence": min(0.55 + growth * 0.3, 0.88),
                "metrics": [
                    {"label": "New bugs (7d)", "value": str(recent_bugs)},
                    {"label": "Δ vs prior", "value": f"+{growth * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _unlabeled_backlog(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        open_issues = [i for i in issues if i.state == "open"]

        if len(open_issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        unlabeled = [i for i in open_issues if not i.labels]
        ratio = len(unlabeled) / len(open_issues)

        if ratio < UNLABELED_BACKLOG_THRESHOLD:
            return []

        severity = "medium" if ratio >= 0.6 else "low"

        return [
            {
                "id": self._make_id("unlabeled", len(unlabeled), now),
                "type": "unlabeled_backlog",
                "severity": severity,
                "title": "Many open issues lack labels",
                "description": (
                    f"{len(unlabeled)} of {len(open_issues)} open issues "
                    f"({ratio * 100:.0f}%) have no labels. Triage signal is low."
                ),
                "recommendation": (
                    "Adopt a baseline label set (type, priority, area) "
                    "and apply during triage."
                ),
                "repository": None,
                "trend": "flat",
                "confidence": min(0.55 + ratio * 0.3, 0.85),
                "metrics": [
                    {"label": "Unlabeled open", "value": str(len(unlabeled))},
                    {"label": "Share", "value": f"{ratio * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _inactive_repositories(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> list[dict[str, Any]]:
        inactive_cutoff = now - timedelta(days=INACTIVE_REPOSITORY_DAYS)
        latest_per_repo: dict[str, datetime] = {}

        for issue in issues:
            existing = latest_per_repo.get(issue.repository_name)
            if existing is None or issue.updated_at > existing:
                latest_per_repo[issue.repository_name] = issue.updated_at

        results: list[dict[str, Any]] = []
        for repository in repositories:
            latest = latest_per_repo.get(repository.full_name)
            if latest is None or latest >= inactive_cutoff:
                continue

            days_silent = (now - latest).days
            severity = "low" if days_silent < 60 else "medium"

            results.append(
                {
                    "id": self._make_id("inactive", repository.full_name, now),
                    "type": "inactive_repository",
                    "severity": severity,
                    "title": "Repository has gone quiet",
                    "description": (
                        f"{repository.full_name} has had no indexed issue activity "
                        f"for {days_silent} days."
                    ),
                    "recommendation": (
                        "Confirm the repository is intentionally dormant, "
                        "or re-sync it from GitHub to refresh activity."
                    ),
                    "repository": repository.full_name,
                    "trend": "down",
                    "confidence": min(0.5 + days_silent / 200, 0.85),
                    "metrics": [
                        {"label": "Silent for", "value": f"{days_silent}d"},
                    ],
                    "created_at": now,
                }
            )

        return results

    def _repository_concentration(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> list[dict[str, Any]]:
        if len(repositories) < 2 or not issues:
            return []

        counts: dict[str, int] = {}
        for issue in issues:
            counts[issue.repository_name] = counts.get(issue.repository_name, 0) + 1

        if not counts:
            return []

        top_repo, top_count = max(counts.items(), key=lambda item: item[1])
        share = top_count / len(issues)

        if share < REPOSITORY_CONCENTRATION_THRESHOLD:
            return []

        return [
            {
                "id": self._make_id("concentration", top_repo, now),
                "type": "repository_concentration",
                "severity": "low",
                "title": "Activity concentrated in one repository",
                "description": (
                    f"{share * 100:.0f}% of indexed issue activity comes from "
                    f"{top_repo}. Workspace signal is dominated by a single repo."
                ),
                "recommendation": (
                    "If this is expected, consider scoping the dashboard to that "
                    "repository for clearer per-repo signal."
                ),
                "repository": top_repo,
                "trend": "flat",
                "confidence": min(0.5 + share * 0.4, 0.85),
                "metrics": [
                    {"label": "Top repo share", "value": f"{share * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _issue_volume_spike(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        if len(issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)
        previous_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS + PREVIOUS_WINDOW_DAYS)

        recent_opened = [i for i in issues if i.created_at >= recent_cutoff]
        previous_opened = [
            i for i in issues
            if previous_cutoff <= i.created_at < recent_cutoff
        ]

        if len(recent_opened) < 5 or not previous_opened:
            return []

        growth = (len(recent_opened) - len(previous_opened)) / len(previous_opened)
        if growth < 0.5:
            return []

        severity = "medium" if growth < 1.5 else "high"

        return [
            {
                "id": self._make_id("volume_spike", len(recent_opened), now),
                "type": "issue_volume_spike",
                "severity": severity,
                "title": "Issue volume rising",
                "description": (
                    f"{len(recent_opened)} new issues opened in the last "
                    f"{RECENT_WINDOW_DAYS} days, up {growth * 100:.0f}% "
                    f"versus the prior {PREVIOUS_WINDOW_DAYS} days."
                ),
                "recommendation": (
                    "Verify triage capacity and ensure on-call/triage rotation "
                    "is staffed for the elevated intake."
                ),
                "repository": None,
                "trend": "up",
                "confidence": min(0.55 + growth * 0.2, 0.88),
                "metrics": [
                    {"label": "New issues (7d)", "value": str(len(recent_opened))},
                    {"label": "Δ vs prior", "value": f"+{growth * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _activity_drop(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        if len(issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)
        previous_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS + PREVIOUS_WINDOW_DAYS)

        recent_active = [i for i in issues if i.updated_at >= recent_cutoff]
        previous_active = [
            i for i in issues
            if previous_cutoff <= i.updated_at < recent_cutoff
        ]

        if len(previous_active) < 5 or len(recent_active) >= len(previous_active):
            return []

        drop = (len(previous_active) - len(recent_active)) / len(previous_active)
        if drop < 0.4:
            return []

        return [
            {
                "id": self._make_id("activity_drop", len(recent_active), now),
                "type": "activity_drop",
                "severity": "low",
                "title": "Activity has slowed",
                "description": (
                    f"Issue activity dropped {drop * 100:.0f}% in the last "
                    f"{RECENT_WINDOW_DAYS} days compared to the previous window."
                ),
                "recommendation": (
                    "Confirm this reflects a code freeze or holiday rather than "
                    "a stalled team. If unintended, check triage cadence."
                ),
                "repository": None,
                "trend": "down",
                "confidence": min(0.5 + drop * 0.3, 0.8),
                "metrics": [
                    {"label": "Active (7d)", "value": str(len(recent_active))},
                    {"label": "Δ vs prior", "value": f"-{drop * 100:.0f}%"},
                ],
                "created_at": now,
            }
        ]

    def _low_engagement_repository(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []

        for repository in repositories:
            repo_issues = [i for i in issues if i.repository_name == repository.full_name]
            open_count = len([i for i in repo_issues if i.state == "open"])

            if open_count < 10:
                continue

            avg_comments = (
                sum(i.comments_count for i in repo_issues) / len(repo_issues)
            )

            if avg_comments >= 1.0:
                continue

            results.append(
                {
                    "id": self._make_id("low_engagement", repository.full_name, now),
                    "type": "low_engagement_repository",
                    "severity": "low",
                    "title": "Low discussion on open issues",
                    "description": (
                        f"{repository.full_name} averages {avg_comments:.1f} comments "
                        "per issue with a meaningful open backlog. Triage may be silent."
                    ),
                    "recommendation": (
                        "Encourage triage acknowledgements — even a label or "
                        "comment helps issue authors trust the workflow."
                    ),
                    "repository": repository.full_name,
                    "trend": "flat",
                    "confidence": 0.6,
                    "metrics": [
                        {"label": "Avg comments", "value": f"{avg_comments:.1f}"},
                        {"label": "Open issues", "value": str(open_count)},
                    ],
                    "created_at": now,
                }
            )

        return results

    def _backlog_growth(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        if len(issues) < MIN_ISSUES_FOR_STABLE_INSIGHT:
            return []

        recent_cutoff = now - timedelta(days=RECENT_WINDOW_DAYS)

        opened_recent = sum(1 for i in issues if i.created_at >= recent_cutoff)
        closed_recent = sum(
            1
            for i in issues
            if i.state == "closed" and i.updated_at >= recent_cutoff
        )

        if opened_recent < 5:
            return []

        if closed_recent >= opened_recent:
            return []

        gap = opened_recent - closed_recent
        ratio = gap / max(opened_recent, 1)

        if ratio < 0.4:
            return []

        severity = "medium" if ratio >= 0.7 else "low"

        return [
            {
                "id": self._make_id("backlog", gap, now),
                "type": "backlog_growth",
                "severity": severity,
                "title": "Backlog is growing faster than it closes",
                "description": (
                    f"{opened_recent} issues opened vs. {closed_recent} closed "
                    f"in the last {RECENT_WINDOW_DAYS} days. Net backlog +{gap}."
                ),
                "recommendation": (
                    "Re-balance work between intake triage and active development "
                    "to keep the backlog from compounding."
                ),
                "repository": None,
                "trend": "up",
                "confidence": min(0.55 + ratio * 0.3, 0.85),
                "metrics": [
                    {"label": "Opened (7d)", "value": str(opened_recent)},
                    {"label": "Closed (7d)", "value": str(closed_recent)},
                ],
                "created_at": now,
            }
        ]

    def _discussion_hotspots(
        self, issues: list[Issue], now: datetime
    ) -> list[dict[str, Any]]:
        recent_cutoff = now - timedelta(days=STALE_THRESHOLD_DAYS)
        hotspots = [
            i for i in issues
            if i.state == "open"
            and i.comments_count >= DISCUSSION_HOTSPOT_COMMENT_THRESHOLD
            and i.updated_at >= recent_cutoff
        ]

        if not hotspots:
            return []

        hotspots.sort(key=lambda i: i.comments_count, reverse=True)
        top = hotspots[0]

        return [
            {
                "id": self._make_id("hotspot", top.github_issue_id, now),
                "type": "discussion_hotspot",
                "severity": "info",
                "title": "Active discussion hotspot",
                "description": (
                    f"#{top.issue_number} in {top.repository_name} has "
                    f"{top.comments_count} comments and is still active. "
                    "Likely a contested decision or unresolved bug."
                ),
                "recommendation": (
                    "Skim the thread for a decision owner. Long discussions "
                    "without a designated owner tend to stall."
                ),
                "repository": top.repository_name,
                "trend": "up",
                "confidence": 0.7,
                "metrics": [
                    {"label": "Comments", "value": str(top.comments_count)},
                    {"label": "Issue", "value": f"#{top.issue_number}"},
                ],
                "created_at": now,
            }
        ]

    def _contributor_load_imbalance(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> list[dict[str, Any]]:
        # Without per-author data in the indexed issues we can still
        # produce a defensible bus-factor proxy by checking how heavily
        # one repository dominates the workspace's open issue load.
        if len(repositories) < 2 or not issues:
            return []

        open_issue_counts: dict[str, int] = {}
        for issue in issues:
            if issue.state != "open":
                continue
            open_issue_counts[issue.repository_name] = (
                open_issue_counts.get(issue.repository_name, 0) + 1
            )

        total_open = sum(open_issue_counts.values())
        if total_open < 20:
            return []

        top_repo, top_count = max(open_issue_counts.items(), key=lambda item: item[1])
        share = top_count / total_open

        if share < 0.7:
            return []

        severity = "medium" if share < 0.85 else "high"

        return [
            {
                "id": self._make_id("contributor_imbalance", top_repo, now),
                "type": "single_repository_dominance",
                "severity": severity,
                "title": "Workload concentrated in one repository",
                "description": (
                    f"{share * 100:.0f}% of open issues live in {top_repo}. "
                    "Maintainer attention may be over-indexed on a single repo."
                ),
                "recommendation": (
                    "Audit whether ownership is balanced across the team. "
                    "Spread review duties or rotate triage to reduce bus-factor risk."
                ),
                "repository": top_repo,
                "trend": "flat",
                "confidence": min(0.55 + share * 0.35, 0.9),
                "metrics": [
                    {"label": "Top repo share", "value": f"{share * 100:.0f}%"},
                    {"label": "Open issues", "value": str(top_count)},
                ],
                "created_at": now,
            }
        ]

    def _healthy_workspace_insight(
        self,
        repositories: list[Repository],
        issues: list[Issue],
        now: datetime,
    ) -> dict[str, Any]:
        return {
            "id": self._make_id("healthy", len(issues), now),
            "type": "workspace_healthy",
            "severity": "info",
            "title": "Workspace looks healthy",
            "description": (
                f"No elevated risks detected across {len(repositories)} repositories "
                f"and {len(issues)} indexed issues. Keep an eye on this panel as "
                "your workspace grows."
            ),
            "recommendation": (
                "Sync additional repositories or wait for more issue history "
                "to surface deeper operational insights."
            ),
            "repository": None,
            "trend": "flat",
            "confidence": 0.6,
            "metrics": [
                {"label": "Repositories", "value": str(len(repositories))},
                {"label": "Indexed issues", "value": str(len(issues))},
            ],
            "created_at": now,
        }

    @staticmethod
    def _make_id(prefix: str, seed: Any, now: datetime) -> str:
        bucket = now.strftime("%Y%m%d%H")
        raw = f"{prefix}:{seed}:{bucket}"
        digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
        return f"{prefix}_{digest}"
