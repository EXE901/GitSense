import os
from datetime import datetime
from pathlib import Path

import httpx
from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


class GitHubServiceError(Exception):
    def __init__(self, message: str, status_code: int):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class GitHubService:
    BASE_URL = "https://api.github.com"
    ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"
    ISSUE_SORT_COLUMNS = {
        "created_at": Issue.created_at,
        "updated_at": Issue.updated_at,
        "comments": Issue.comments_count,
        "number": Issue.issue_number,
        "title": Issue.title,
        "state": Issue.state,
        "repo": Issue.repository_name
    }

    def __init__(self, token: str | None = None):
        resolved_token = token or self._load_token_from_environment()

        self.headers = {
            "Accept": "application/vnd.github+json"
        }

        if resolved_token:
            self.headers["Authorization"] = f"Bearer {resolved_token}"

    async def fetch_issues(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        sort: str = "created",
        direction: str = "desc",
        max_pages: int = 3
    ):
        issues_data = []
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/issues"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for page in range(1, max_pages + 1):
                    response = await client.get(
                        url,
                        headers=self.headers,
                        params=self._build_issue_params(
                            state=state,
                            sort=sort,
                            direction=direction,
                            page=page
                        )
                    )
                    self._raise_for_api_error(response, owner, repo)
                    issues = response.json()

                    if not issues:
                        break

                    for issue in issues:
                        if self._is_pull_request(issue):
                            continue

                        issues_data.append(self._format_issue(issue))
        except httpx.RequestError as exc:
            raise GitHubServiceError(
                "Unable to reach GitHub right now. Please try again shortly.",
                status_code=502
            ) from exc

        return issues_data

    async def save_issues(
        self,
        db: AsyncSession,
        issues: list[dict],
        repository_name: str
    ) -> None:
        if not issues:
            return

        try:
            existing_issues = await self._get_existing_issues(db, issues)

            for issue_data in issues:
                github_issue_id = issue_data["id"]
                issue = existing_issues.get(github_issue_id)

                if issue is None:
                    issue = Issue(github_issue_id=github_issue_id)
                    db.add(issue)

                self._apply_issue_data(
                    issue=issue,
                    issue_data=issue_data,
                    repository_name=repository_name
                )

            await db.commit()
        except SQLAlchemyError as exc:
            await db.rollback()
            raise GitHubServiceError(
                "Fetched issues, but failed to save them to the database.",
                status_code=500
            ) from exc

    async def get_stored_issues(
        self,
        db: AsyncSession,
        repo: str | None = None,
        state: str | None = None,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "updated_at",
        sort_direction: str = "desc"
    ) -> dict:
        try:
            filtered_query = self._build_stored_issues_query(
                repo=repo,
                state=state
            )
            total_issues = await self._count_stored_issues(
                db=db,
                query=filtered_query
            )
            paginated_query = self._apply_stored_issue_sorting(
                query=filtered_query,
                sort_by=sort_by,
                sort_direction=sort_direction
            ).offset((page - 1) * limit).limit(limit)

            result = await db.execute(paginated_query)
            issues = result.scalars().all()

            return {
                "total_issues": total_issues,
                "page": page,
                "limit": limit,
                "issues": [
                    self._format_stored_issue(issue)
                    for issue in issues
                ]
            }
        except SQLAlchemyError as exc:
            raise GitHubServiceError(
                "Failed to retrieve stored issues from the database.",
                status_code=500
            ) from exc

    def _build_issue_params(
        self,
        state: str,
        sort: str,
        direction: str,
        page: int
    ) -> dict[str, str | int]:
        return {
            "state": state,
            "sort": sort,
            "direction": direction,
            "per_page": 100,
            "page": page
        }

    def _is_pull_request(self, issue: dict) -> bool:
        return "pull_request" in issue

    def _format_issue(self, issue: dict) -> dict:
        return {
            "id": issue["id"],
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "comments": issue["comments"],
            "labels": self._extract_label_names(issue),
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
            "url": issue["html_url"]
        }

    def _extract_label_names(self, issue: dict) -> list[str]:
        return [
            label["name"]
            for label in issue["labels"]
        ]

    async def _get_existing_issues(
        self,
        db: AsyncSession,
        issues: list[dict]
    ) -> dict[int, Issue]:
        github_issue_ids = [
            issue["id"]
            for issue in issues
        ]

        result = await db.execute(
            select(Issue).where(Issue.github_issue_id.in_(github_issue_ids))
        )
        existing_issues = result.scalars().all()

        return {
            issue.github_issue_id: issue
            for issue in existing_issues
        }

    def _apply_issue_data(
        self,
        issue: Issue,
        issue_data: dict,
        repository_name: str
    ) -> None:
        issue.issue_number = issue_data["number"]
        issue.title = issue_data["title"]
        issue.state = issue_data["state"]
        issue.comments_count = issue_data["comments"]
        issue.labels = issue_data["labels"]
        issue.created_at = self._parse_github_datetime(issue_data["created_at"])
        issue.updated_at = self._parse_github_datetime(issue_data["updated_at"])
        issue.issue_url = issue_data["url"]
        issue.repository_name = repository_name

    def _parse_github_datetime(self, value: str) -> datetime:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    def _build_stored_issues_query(
        self,
        repo: str | None,
        state: str | None
    ) -> Select:
        query = select(Issue)

        if repo:
            query = query.where(Issue.repository_name == repo)

        if state:
            query = query.where(Issue.state == state)

        return query

    async def _count_stored_issues(
        self,
        db: AsyncSession,
        query: Select
    ) -> int:
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)

        return result.scalar_one()

    def _apply_stored_issue_sorting(
        self,
        query: Select,
        sort_by: str,
        sort_direction: str
    ) -> Select:
        sort_column = self.ISSUE_SORT_COLUMNS[sort_by]

        if sort_direction == "asc":
            return query.order_by(sort_column.asc())

        return query.order_by(sort_column.desc())

    def _format_stored_issue(self, issue: Issue) -> dict:
        return {
            "id": issue.github_issue_id,
            "number": issue.issue_number,
            "title": issue.title,
            "state": issue.state,
            "comments": issue.comments_count,
            "labels": issue.labels,
            "created_at": issue.created_at.isoformat(),
            "updated_at": issue.updated_at.isoformat(),
            "url": issue.issue_url,
            "repo": issue.repository_name
        }

    def _load_token_from_environment(self) -> str | None:
        self._load_dotenv_file()
        return os.getenv("GITHUB_TOKEN")

    def _load_dotenv_file(self) -> None:
        if load_dotenv is None:
            return

        load_dotenv(dotenv_path=self.ENV_FILE_PATH, override=False)

    def _raise_for_api_error(
        self,
        response: httpx.Response,
        owner: str,
        repo: str
    ) -> None:
        if response.is_success:
            return

        if response.status_code == 404:
            raise GitHubServiceError(
                f"Repository '{owner}/{repo}' was not found on GitHub.",
                status_code=404
            )

        if self._is_rate_limited(response):
            raise GitHubServiceError(
                "GitHub API rate limit exceeded. Please try again later.",
                status_code=429
            )

        raise GitHubServiceError(
            "GitHub API request failed. Please try again later.",
            status_code=502
        )

    def _is_rate_limited(self, response: httpx.Response) -> bool:
        return (
            response.status_code == 429 or
            (
                response.status_code == 403 and
                response.headers.get("x-ratelimit-remaining") == "0"
            )
        )
