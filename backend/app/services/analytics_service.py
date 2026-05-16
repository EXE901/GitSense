import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.models.repository import Repository, RepositoryIssue
from app.models.user import User
from app.services.ownership_service import OwnershipContext


GITHUB_API_BASE_URL = "https://api.github.com"
ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"

load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


class AnalyticsService:
    """
    Centralized analytics aggregation service.
    All analytics computation logic belongs here, not in routes.
    Supports ownership-aware queries respecting user/guest boundaries.
    """

    def __init__(self) -> None:
        self.github_token = os.getenv("GITHUB_TOKEN")

    async def get_dashboard_overview(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        repo: str | None = None,
    ) -> dict[str, Any]:
        """
        Return high-level dashboard metrics derived from persisted data.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return {
                "total_issues": 0,
                "open_issues": 0,
                "closed_issues": 0,
                "indexed_issues": 0,
                "avg_comments_per_issue": 0,
                "repositories_tracked": 0,
                "unique_labels": 0,
                "open_closed_ratio": 0,
                "stale_issues_count": 0,
                "stars_count": 0,
                "forks_count": 0,
                "watchers_count": 0,
            }

        issues = await self._get_repository_issues(db, repository_ids)

        indexed_issues = len(issues)
        indexed_open_issues = len([i for i in issues if i.state == "open"])
        indexed_closed_issues = len([i for i in issues if i.state == "closed"])
        total_issues = sum(repo.total_issues_count for repo in repositories) or indexed_issues
        open_issues = sum(repo.open_issues_count for repo in repositories) or indexed_open_issues
        closed_issues = sum(repo.closed_issues_count for repo in repositories) or indexed_closed_issues
        total_comments = sum(i.comments_count for i in issues)
        avg_comments = total_comments / indexed_issues if indexed_issues > 0 else 0

        unique_labels = self._count_unique_labels(issues)
        open_closed_ratio = (
            open_issues / closed_issues if closed_issues > 0 else 0
        )

        stale_threshold = datetime.now(timezone.utc) - timedelta(days=14)
        stale_issues = len(
            [i for i in issues if i.updated_at < stale_threshold]
        )

        return {
            "total_issues": total_issues,
            "open_issues": open_issues,
            "closed_issues": closed_issues,
            "indexed_issues": indexed_issues,
            "avg_comments_per_issue": round(avg_comments, 1),
            "repositories_tracked": len(repositories),
            "unique_labels": unique_labels,
            "open_closed_ratio": round(open_closed_ratio, 2),
            "stale_issues_count": stale_issues,
            "stars_count": sum(repo.stars_count for repo in repositories),
            "forks_count": sum(repo.forks_count for repo in repositories),
            "watchers_count": sum(repo.watchers_count for repo in repositories),
        }

    async def get_activity_timeline(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        days: int = 30,
        repo: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return activity data over time for chart visualization.
        Groups issues by date, counts open/closed per day.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return []

        issues = await self._get_repository_issues(db, repository_ids)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        activity_map: dict[str, dict[str, int]] = {}

        for issue in issues:
            if issue.updated_at < cutoff_date:
                continue

            date_key = issue.updated_at.date().isoformat()

            if date_key not in activity_map:
                activity_map[date_key] = {"date": date_key, "open": 0, "closed": 0}

            if issue.state == "open":
                activity_map[date_key]["open"] += 1
            else:
                activity_map[date_key]["closed"] += 1

        return sorted(activity_map.values(), key=lambda x: x["date"])

    async def get_label_distribution(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        limit: int = 10,
        repo: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return label frequency distribution sorted by count.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return []

        issues = await self._get_repository_issues(db, repository_ids)

        label_counts: dict[str, int] = {}
        for issue in issues:
            for label in issue.labels:
                label_counts[label] = label_counts.get(label, 0) + 1

        result = [
            {"label": label, "count": count}
            for label, count in sorted(
                label_counts.items(), key=lambda x: x[1], reverse=True
            )[:limit]
        ]

        return result

    async def get_repository_metrics(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        limit: int = 10,
        repo: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return per-repository metrics sorted by issue count.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return []

        issues = await self._get_repository_issues(db, repository_ids)

        # Build repo metrics
        repo_metrics: dict[str, dict[str, Any]] = {}

        for repo in repositories:
            indexed_repo_issues = [
                issue for issue in issues if issue.repository_name == repo.full_name
            ]
            indexed_total_issues = len(indexed_repo_issues)
            aggregate_total_issues = repo.total_issues_count or indexed_total_issues
            aggregate_open_issues = repo.open_issues_count or len(
                [issue for issue in indexed_repo_issues if issue.state == "open"]
            )
            aggregate_closed_issues = repo.closed_issues_count or len(
                [issue for issue in indexed_repo_issues if issue.state == "closed"]
            )
            repo_metrics[repo.full_name] = {
                "repository": repo.full_name,
                "total_issues": aggregate_total_issues,
                "open_issues": aggregate_open_issues,
                "closed_issues": aggregate_closed_issues,
                "indexed_issues": indexed_total_issues,
                "stars_count": repo.stars_count,
                "forks_count": repo.forks_count,
                "watchers_count": repo.watchers_count,
                "issue_pages_synced": repo.issue_pages_synced,
                "issue_pages_exhausted": repo.issue_pages_exhausted,
                "avg_comments": 0,
                "last_activity": repo.last_synced_at.isoformat() if repo.last_synced_at else None,
            }

        # Calculate averages from indexed issues.
        for metric in repo_metrics.values():
            if metric["indexed_issues"] > 0:
                total_comments = sum(
                    i.comments_count
                    for i in issues
                    if i.repository_name == metric["repository"]
                )
                metric["avg_comments"] = round(
                    total_comments / metric["indexed_issues"], 1
                )

        result = sorted(
            repo_metrics.values(),
            key=lambda x: x["total_issues"],
            reverse=True,
        )[:limit]

        return result

    async def get_issue_state_distribution(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        repo: str | None = None,
    ) -> dict[str, int]:
        """
        Return count of issues by state.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return {"open": 0, "closed": 0}

        issues = await self._get_repository_issues(db, repository_ids)
        aggregate_open_issues = sum(repo.open_issues_count for repo in repositories)
        aggregate_closed_issues = sum(repo.closed_issues_count for repo in repositories)

        if aggregate_open_issues or aggregate_closed_issues:
            return {
                "open": aggregate_open_issues,
                "closed": aggregate_closed_issues,
            }

        return {
            "open": len([i for i in issues if i.state == "open"]),
            "closed": len([i for i in issues if i.state == "closed"]),
        }

    async def get_stale_issues(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        days: int = 14,
        limit: int = 20,
        repo: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Return open issues not updated in X days.
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return []

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        issues = await self._get_repository_issues(db, repository_ids)

        stale = [
            {
                "number": i.issue_number,
                "title": i.title,
                "repository": i.repository_name,
                "updated_at": i.updated_at.isoformat(),
                "url": i.issue_url,
                "days_since_update": (
                    (datetime.now(timezone.utc) - i.updated_at).days
                ),
            }
            for i in issues
            if i.state == "open" and i.updated_at < cutoff_date
        ]

        return sorted(
            stale, key=lambda x: x["days_since_update"], reverse=True
        )[:limit]

    async def get_developer_contribution_summary(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        repo: str | None = None,
    ) -> dict[str, Any]:
        """
        Return developer contribution metrics (foundation for future insights).
        """
        repositories = await self._get_owned_repositories(db, ownership_context, repo)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return {
                "total_repositories": 0,
                "total_issues_tracked": 0,
                "average_comments_per_issue": 0,
                "most_active_repository": None,
            }

        issues = await self._get_repository_issues(db, repository_ids)

        # Count issues per repo
        repo_counts: dict[str, int] = {}
        for issue in issues:
            repo_counts[issue.repository_name] = repo_counts.get(issue.repository_name, 0) + 1

        most_active_repo = (
            max(repo_counts.items(), key=lambda x: x[1])[0]
            if repo_counts
            else None
        )

        total_comments = sum(i.comments_count for i in issues)
        avg_comments = (
            total_comments / len(issues) if issues else 0
        )

        return {
            "total_repositories": len(repositories),
            "total_issues_tracked": len(issues),
            "average_comments_per_issue": round(avg_comments, 1),
            "most_active_repository": most_active_repo,
        }

    async def get_authenticated_github_activity(self, current_user: User) -> dict[str, Any]:
        """
        Return contribution activity for the authenticated user's linked GitHub identity.
        Uses GitHub's API with the backend token when configured and does not persist
        the OAuth provider token.
        """
        if not current_user.github_username:
            return {
                "linked": False,
                "available": False,
                "authenticated_api": bool(self.github_token),
                "message": "Connect GitHub to load developer contribution activity.",
                "profile": None,
                "metrics": self._empty_github_activity_metrics(),
                "repositories": [],
                "recent_activity": [],
            }

        username = current_user.github_username
        headers = self._build_github_headers()

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                opened_response = await self._search_github_issues(
                    client,
                    headers,
                    query=f"type:issue author:{username}",
                    per_page=5,
                )
                closed_response = await self._search_github_issues(
                    client,
                    headers,
                    query=f"type:issue closed-by:{username}",
                    per_page=5,
                )
                assigned_response = await self._search_github_issues(
                    client,
                    headers,
                    query=f"type:issue assignee:{username}",
                    per_page=5,
                )
                participated_response = await self._search_github_issues(
                    client,
                    headers,
                    query=f"type:issue involves:{username}",
                    per_page=10,
                )
        except httpx.RequestError:
            return self._build_unavailable_github_activity(
                current_user,
                "GitHub contribution activity is temporarily unavailable."
            )

        responses = [
            opened_response,
            closed_response,
            assigned_response,
            participated_response,
        ]

        if any(response.status_code in {401, 403, 429} for response in responses):
            return self._build_unavailable_github_activity(
                current_user,
                "GitHub API limits or credentials prevented contribution activity from loading."
            )

        if any(not response.is_success for response in responses):
            return self._build_unavailable_github_activity(
                current_user,
                "GitHub contribution activity could not be loaded right now."
            )

        opened = opened_response.json()
        closed = closed_response.json()
        assigned = assigned_response.json()
        participated = participated_response.json()
        recent_items = participated.get("items", [])

        return {
            "linked": True,
            "available": True,
            "authenticated_api": bool(self.github_token),
            "message": "GitHub contribution activity loaded.",
            "profile": {
                "username": username,
                "display_name": current_user.github_display_name,
                "avatar_url": current_user.github_avatar_url,
                "profile_url": current_user.github_profile_url,
            },
            "metrics": {
                "opened_issues": opened.get("total_count", 0),
                "closed_issues": closed.get("total_count", 0),
                "assigned_issues": assigned.get("total_count", 0),
                "participated_issues": participated.get("total_count", 0),
                "repositories_participated": len(self._build_repository_activity(recent_items)),
            },
            "repositories": self._build_repository_activity(recent_items),
            "recent_activity": [
                self._format_github_activity_item(item)
                for item in recent_items
            ],
        }

    # Private helper methods

    async def _get_owned_repositories(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        repo: str | None = None,
    ) -> list[Repository]:
        """
        Get all repositories owned by the user or guest session.
        """
        if not ownership_context:
            return []

        query = select(Repository)

        if ownership_context.user_id:
            query = query.where(Repository.user_id == ownership_context.user_id)
        elif ownership_context.guest_session_id:
            query = query.where(
                Repository.guest_session_id == ownership_context.guest_session_id
            )
        else:
            return []

        if repo:
            query = query.where(Repository.full_name == repo)

        result = await db.execute(query)
        return result.scalars().all()

    async def _get_repository_issues(
        self,
        db: AsyncSession,
        repository_ids: list[int],
    ) -> list[Issue]:
        """
        Get all issues linked to the given repository IDs.
        """
        if not repository_ids:
            return []

        # Query through RepositoryIssue join table
        query = (
            select(Issue)
            .join(RepositoryIssue, Issue.id == RepositoryIssue.issue_id)
            .where(RepositoryIssue.repository_id.in_(repository_ids))
            .distinct()
        )

        result = await db.execute(query)
        return result.scalars().all()

    def _count_unique_labels(self, issues: list[Issue]) -> int:
        """
        Count unique labels across all issues.
        """
        label_set = set()
        for issue in issues:
            for label in issue.labels:
                label_set.add(label)
        return len(label_set)

    def _build_github_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        if self.github_token:
            headers["Authorization"] = f"Bearer {self.github_token}"

        return headers

    async def _search_github_issues(
        self,
        client: httpx.AsyncClient,
        headers: dict[str, str],
        query: str,
        per_page: int,
    ) -> httpx.Response:
        return await client.get(
            f"{GITHUB_API_BASE_URL}/search/issues",
            headers=headers,
            params={
                "q": query,
                "sort": "updated",
                "order": "desc",
                "per_page": per_page,
            },
        )

    def _build_repository_activity(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        repository_counts: dict[str, int] = {}

        for item in items:
            repository_name = self._extract_repository_name(item)

            if repository_name:
                repository_counts[repository_name] = repository_counts.get(repository_name, 0) + 1

        return [
            {"repository": repository, "recent_activity": count}
            for repository, count in sorted(
                repository_counts.items(),
                key=lambda entry: entry[1],
                reverse=True,
            )
        ]

    def _format_github_activity_item(self, item: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": item.get("id"),
            "number": item.get("number"),
            "title": item.get("title"),
            "state": item.get("state"),
            "repository": self._extract_repository_name(item),
            "url": item.get("html_url"),
            "updated_at": item.get("updated_at"),
            "labels": [
                label.get("name")
                for label in item.get("labels", [])
                if label.get("name")
            ],
        }

    def _extract_repository_name(self, item: dict[str, Any]) -> str | None:
        repository_url = item.get("repository_url")

        if isinstance(repository_url, str):
            marker = f"{GITHUB_API_BASE_URL}/repos/"

            if repository_url.startswith(marker):
                return repository_url.replace(marker, "", 1)

        html_url = item.get("html_url")

        if isinstance(html_url, str):
            parts = html_url.replace("https://github.com/", "").split("/")

            if len(parts) >= 2:
                return f"{parts[0]}/{parts[1]}"

        return None

    def _empty_github_activity_metrics(self) -> dict[str, int]:
        return {
            "opened_issues": 0,
            "closed_issues": 0,
            "assigned_issues": 0,
            "participated_issues": 0,
            "repositories_participated": 0,
        }

    def _build_unavailable_github_activity(
        self,
        current_user: User,
        message: str,
    ) -> dict[str, Any]:
        return {
            "linked": True,
            "available": False,
            "authenticated_api": bool(self.github_token),
            "message": message,
            "profile": {
                "username": current_user.github_username,
                "display_name": current_user.github_display_name,
                "avatar_url": current_user.github_avatar_url,
                "profile_url": current_user.github_profile_url,
            },
            "metrics": self._empty_github_activity_metrics(),
            "repositories": [],
            "recent_activity": [],
        }

    # ============================================================================
    # Developer Analytics Foundation Methods
    # ============================================================================

    async def get_developer_profile_summary(
        self,
        db: AsyncSession,
        current_user_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Get a summary of developer activity across their indexed repositories.
        Foundation for future developer insights.

        Only accessible to authenticated users with the given user_id.
        """
        if not current_user_id:
            return {
                "repositories_indexed": 0,
                "total_issues_tracked": 0,
                "active_repositories": 0,
                "developer_context": "none",
            }

        # Create ownership context for this user
        ownership_context = await self._get_user_ownership_context(
            db=db,
            user_id=current_user_id
        )

        if not ownership_context:
            return {
                "repositories_indexed": 0,
                "total_issues_tracked": 0,
                "active_repositories": 0,
                "developer_context": "user_not_found",
            }

        repositories = await self._get_owned_repositories(db, ownership_context)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return {
                "repositories_indexed": 0,
                "total_issues_tracked": 0,
                "active_repositories": 0,
                "developer_context": "authenticated",
            }

        issues = await self._get_repository_issues(db, repository_ids)

        # Count active repositories (those with recent activity)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        active_repos = set()
        for issue in issues:
            if issue.updated_at >= cutoff_date:
                active_repos.add(issue.repository_name)

        return {
            "repositories_indexed": len(repositories),
            "total_issues_tracked": len(issues),
            "active_repositories": len(active_repos),
            "developer_context": "authenticated",
        }

    async def get_developer_activity_focus(
        self,
        db: AsyncSession,
        current_user_id: int | None = None,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        """
        Get developer's top areas of activity over N days.
        Shows which repositories have been most active.

        Foundation for future productivity insights.
        """
        if not current_user_id:
            return []

        ownership_context = await self._get_user_ownership_context(
            db=db,
            user_id=current_user_id
        )

        if not ownership_context:
            return []

        repositories = await self._get_owned_repositories(db, ownership_context)
        repository_ids = [repo.id for repo in repositories]

        if not repository_ids:
            return []

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        issues = await self._get_repository_issues(db, repository_ids)

        # Build activity focus map
        focus_map: dict[str, dict[str, Any]] = {}

        for issue in issues:
            if issue.updated_at < cutoff_date:
                continue

            repo_name = issue.repository_name

            if repo_name not in focus_map:
                focus_map[repo_name] = {
                    "repository": repo_name,
                    "recent_activity": 0,
                    "open_issues": 0,
                    "closed_issues": 0,
                }

            focus_map[repo_name]["recent_activity"] += 1

            if issue.state == "open":
                focus_map[repo_name]["open_issues"] += 1
            else:
                focus_map[repo_name]["closed_issues"] += 1

        result = sorted(
            focus_map.values(),
            key=lambda x: x["recent_activity"],
            reverse=True
        )

        return result

    async def get_developer_insights_foundation(
        self,
        db: AsyncSession,
        current_user_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Comprehensive developer insights foundation.
        Prepares structure for future AI-powered insights.

        Only accessible to authenticated users.
        """
        if not current_user_id:
            return {
                "linked": False,
                "insights_ready": False,
            }

        ownership_context = await self._get_user_ownership_context(
            db=db,
            user_id=current_user_id
        )

        if not ownership_context:
            return {
                "linked": False,
                "insights_ready": False,
            }

        repositories = await self._get_owned_repositories(db, ownership_context)
        repository_ids = [repo.id for repo in repositories]

        has_indexed_repos = len(repository_ids) > 0

        overview = await self.get_dashboard_overview(
            db=db,
            ownership_context=ownership_context
        )

        activity_focus = await self.get_developer_activity_focus(
            db=db,
            current_user_id=current_user_id,
            days=30
        )

        return {
            "linked": True,
            "insights_ready": has_indexed_repos,
            "repositories_indexed": len(repositories),
            "total_issues": overview["total_issues"],
            "open_issues": overview["open_issues"],
            "closed_issues": overview["closed_issues"],
            "activity_focus": activity_focus[:3],  # Top 3 active repos
            "average_comments": overview["avg_comments_per_issue"],
        }

    # Helper method for getting user ownership context
    async def _get_user_ownership_context(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> "OwnershipContext | None":
        """
        Create ownership context for a specific user ID.
        """
        from app.services.ownership_service import OwnershipContext

        # Verify user exists
        from app.models.user import User
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return None

        return OwnershipContext(
            user_id=user_id,
            guest_session_id=None,
            is_demo=False,
            expires_at=None
        )
