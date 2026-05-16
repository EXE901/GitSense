import os
from datetime import datetime
from pathlib import Path

import httpx
from sqlalchemy import Select, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.issue import Issue
from app.models.repository import Repository, RepositoryIssue
from app.services.ownership_service import OwnershipContext

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
    ISSUE_PAGE_SIZE = 100
    INITIAL_ISSUE_PAGES = 3
    PAGINATION_CHUNK_PAGES = 2
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
    ) -> list[dict]:
        issue_chunk = await self.fetch_issue_chunk(
            owner=owner,
            repo=repo,
            start_page=1,
            max_pages=max_pages,
            state=state,
            sort=sort,
            direction=direction
        )

        return issue_chunk["issues"]

    async def fetch_repository_metadata(self, owner: str, repo: str) -> dict:
        url = f"{self.BASE_URL}/repos/{owner}/{repo}"

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, headers=self.headers)
                self._raise_for_api_error(response, owner, repo)
        except httpx.RequestError as exc:
            raise GitHubServiceError(
                "Unable to reach GitHub right now. Please try again shortly.",
                status_code=502
            ) from exc

        payload = response.json()
        full_name = payload.get("full_name") or f"{owner}/{repo}"
        issue_counts = await self.fetch_issue_counts(owner, repo)

        return {
            "full_name": full_name,
            "description": payload.get("description"),
            "html_url": payload.get("html_url"),
            "default_branch": payload.get("default_branch"),
            "language": payload.get("language"),
            "stars_count": payload.get("stargazers_count") or 0,
            "forks_count": payload.get("forks_count") or 0,
            "watchers_count": payload.get("watchers_count") or 0,
            "open_issues_count": issue_counts["open"],
            "closed_issues_count": issue_counts["closed"],
            "total_issues_count": issue_counts["total"],
            "github_updated_at": self._parse_optional_github_datetime(payload.get("updated_at")),
            "github_pushed_at": self._parse_optional_github_datetime(payload.get("pushed_at")),
        }

    async def fetch_issue_counts(self, owner: str, repo: str) -> dict[str, int]:
        queries = {
            "total": f"repo:{owner}/{repo} type:issue",
            "open": f"repo:{owner}/{repo} type:issue state:open",
            "closed": f"repo:{owner}/{repo} type:issue state:closed",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                responses = {
                    key: await client.get(
                        f"{self.BASE_URL}/search/issues",
                        headers=self.headers,
                        params={"q": query, "per_page": 1}
                    )
                    for key, query in queries.items()
                }
        except httpx.RequestError:
            return {"total": 0, "open": 0, "closed": 0}

        counts: dict[str, int] = {}

        for key, response in responses.items():
            if response.is_success:
                counts[key] = response.json().get("total_count", 0)
            else:
                counts[key] = 0

        return counts

    async def fetch_issue_chunk(
        self,
        owner: str,
        repo: str,
        start_page: int,
        max_pages: int,
        state: str = "all",
        sort: str = "created",
        direction: str = "desc",
    ) -> dict:
        issues_data = []
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/issues"
        pages_fetched = 0
        is_exhausted = False

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for page in range(start_page, start_page + max_pages):
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
                    pages_fetched += 1

                    if not issues:
                        is_exhausted = True
                        break

                    if len(issues) < self.ISSUE_PAGE_SIZE:
                        is_exhausted = True

                    for issue in issues:
                        if self._is_pull_request(issue):
                            continue

                        issues_data.append(self._format_issue(issue))
        except httpx.RequestError as exc:
            raise GitHubServiceError(
                "Unable to reach GitHub right now. Please try again shortly.",
                status_code=502
            ) from exc

        return {
            "issues": issues_data,
            "pages_fetched": pages_fetched,
            "last_page": start_page + pages_fetched - 1 if pages_fetched else start_page - 1,
            "is_exhausted": is_exhausted or pages_fetched < max_pages,
        }

    async def sync_repository(
        self,
        db: AsyncSession,
        owner: str,
        repo: str,
        repository: Repository,
        max_pages: int = INITIAL_ISSUE_PAGES,
    ) -> dict:
        metadata = await self.fetch_repository_metadata(owner, repo)
        self.apply_repository_metadata(repository, metadata)

        start_page = repository.issue_pages_synced + 1
        issue_chunk = await self.fetch_issue_chunk(
            owner=owner,
            repo=repo,
            start_page=start_page,
            max_pages=max_pages,
        )
        await self.save_issues(
            db=db,
            issues=issue_chunk["issues"],
            repository_name=repository.full_name,
            repository=repository,
            issue_chunk=issue_chunk,
        )

        return {
            "repository": repository,
            "issues": issue_chunk["issues"],
            "metadata": metadata,
            "issue_chunk": issue_chunk,
        }

    async def preview_repository(
        self,
        owner: str,
        repo: str,
        page: int,
        limit: int,
        state: str = "all",
        sort: str = "updated",
        direction: str = "desc",
    ) -> dict:
        metadata = await self.fetch_repository_metadata(owner, repo)
        requested_issue_count = page * limit
        pages_to_fetch = min(
            max(1, (requested_issue_count // self.ISSUE_PAGE_SIZE) + 2),
            self.PAGINATION_CHUNK_PAGES * 5,
        )
        issue_chunk = await self.fetch_issue_chunk(
            owner=owner,
            repo=repo,
            start_page=1,
            max_pages=pages_to_fetch,
            state=state,
            sort=sort,
            direction=direction,
        )
        start_index = (page - 1) * limit
        end_index = start_index + limit
        preview_issues = [
            {**issue, "repo": metadata["full_name"]}
            for issue in issue_chunk["issues"][start_index:end_index]
        ]

        return {
            "repo": metadata["full_name"],
            "repository": metadata,
            "total_issues": metadata["total_issues_count"],
            "indexed_issues": len(issue_chunk["issues"]),
            "page": page,
            "limit": limit,
            "issues": preview_issues,
        }

    async def ensure_issue_pages_for_view(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        repo: str | None,
        page: int,
        limit: int,
    ) -> None:
        if not ownership_context or not repo:
            return

        repository = await self._get_repository_for_context(db, ownership_context, repo)

        if not repository or repository.issue_pages_exhausted:
            return

        target_indexed_count = page * limit
        indexed_count = await self._count_indexed_repository_issues(
            db=db,
            repository_id=repository.id,
        )

        if indexed_count >= target_indexed_count:
            return

        owner, repo_name = repository.full_name.split("/", 1)
        pages_fetched_this_request = 0

        while (
            indexed_count < target_indexed_count
            and not repository.issue_pages_exhausted
            and pages_fetched_this_request < self.PAGINATION_CHUNK_PAGES * 5
        ):
            issue_chunk = await self.fetch_issue_chunk(
                owner=owner,
                repo=repo_name,
                start_page=repository.issue_pages_synced + 1,
                max_pages=self.PAGINATION_CHUNK_PAGES,
            )
            await self.save_issues(
                db=db,
                issues=issue_chunk["issues"],
                repository_name=repository.full_name,
                repository=repository,
                issue_chunk=issue_chunk,
            )
            pages_fetched_this_request += issue_chunk["pages_fetched"]
            indexed_count = await self._count_indexed_repository_issues(
                db=db,
                repository_id=repository.id,
            )

    async def save_issues(
        self,
        db: AsyncSession,
        issues: list[dict],
        repository_name: str,
        repository: Repository | None = None,
        issue_chunk: dict | None = None,
    ) -> None:
        try:
            if repository and issue_chunk:
                repository.issue_pages_synced = max(
                    repository.issue_pages_synced,
                    issue_chunk["last_page"]
                )
                repository.issue_pages_exhausted = issue_chunk["is_exhausted"]

            if not issues:
                await db.commit()
                return

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

                await db.flush()

                if repository:
                    await self._link_issue_to_repository(
                        db=db,
                        repository_id=repository.id,
                        issue_id=issue.id
                    )

            await db.commit()
        except SQLAlchemyError as exc:
            await db.rollback()
            raise GitHubServiceError(
                "Fetched issues, but failed to save them to the database.",
                status_code=500
            ) from exc

    def apply_repository_metadata(self, repository: Repository, metadata: dict) -> None:
        repository.description = metadata["description"]
        repository.html_url = metadata["html_url"]
        repository.default_branch = metadata["default_branch"]
        repository.language = metadata["language"]
        repository.stars_count = metadata["stars_count"]
        repository.forks_count = metadata["forks_count"]
        repository.watchers_count = metadata["watchers_count"]
        repository.open_issues_count = metadata["open_issues_count"]
        repository.closed_issues_count = metadata["closed_issues_count"]
        repository.total_issues_count = metadata["total_issues_count"]
        repository.github_updated_at = metadata["github_updated_at"]
        repository.github_pushed_at = metadata["github_pushed_at"]

    async def get_stored_issues(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None = None,
        repo: str | None = None,
        state: str | None = None,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "updated_at",
        sort_direction: str = "desc"
    ) -> dict:
        try:
            filtered_query = self._build_stored_issues_query(
                ownership_context=ownership_context,
                repo=repo,
                state=state
            )
            total_issues = await self._count_stored_issues(
                db=db,
                query=filtered_query
            )
            total_issues = await self._resolve_issue_total(
                db=db,
                ownership_context=ownership_context,
                repo=repo,
                state=state,
                indexed_total=total_issues
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

    async def _resolve_issue_total(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext | None,
        repo: str | None,
        state: str | None,
        indexed_total: int,
    ) -> int:
        if not ownership_context or not repo:
            return indexed_total

        repository = await self._get_repository_for_context(db, ownership_context, repo)

        if not repository:
            return indexed_total

        if state == "open":
            aggregate_total = repository.open_issues_count
        elif state == "closed":
            aggregate_total = repository.closed_issues_count
        else:
            aggregate_total = repository.total_issues_count

        return max(indexed_total, aggregate_total)

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

    def _parse_optional_github_datetime(self, value: str | None) -> datetime | None:
        if not value:
            return None

        return self._parse_github_datetime(value)

    def _build_stored_issues_query(
        self,
        ownership_context: OwnershipContext | None,
        repo: str | None,
        state: str | None
    ) -> Select:
        query = select(Issue)

        if ownership_context:
            query = (
                query
                .join(RepositoryIssue, RepositoryIssue.issue_id == Issue.id)
                .join(Repository, Repository.id == RepositoryIssue.repository_id)
            )

            if ownership_context.user_id:
                query = query.where(Repository.user_id == ownership_context.user_id)
            else:
                query = query.where(Repository.guest_session_id == ownership_context.guest_session_id)

        if repo:
            if ownership_context:
                query = query.where(Repository.full_name == repo)
            else:
                query = query.where(Issue.repository_name == repo)

        if state:
            query = query.where(Issue.state == state)

        return query

    async def _get_repository_for_context(
        self,
        db: AsyncSession,
        ownership_context: OwnershipContext,
        full_name: str
    ) -> Repository | None:
        query = select(Repository).where(Repository.full_name == full_name)

        if ownership_context.user_id:
            query = query.where(Repository.user_id == ownership_context.user_id)
        else:
            query = query.where(Repository.guest_session_id == ownership_context.guest_session_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def _link_issue_to_repository(
        self,
        db: AsyncSession,
        repository_id: int,
        issue_id: int
    ) -> None:
        existing_link = await db.get(
            RepositoryIssue,
            {
                "repository_id": repository_id,
                "issue_id": issue_id
            }
        )

        if existing_link is None:
            db.add(
                RepositoryIssue(
                    repository_id=repository_id,
                    issue_id=issue_id
                )
            )

    async def _count_stored_issues(
        self,
        db: AsyncSession,
        query: Select
    ) -> int:
        count_query = select(func.count()).select_from(query.subquery())
        result = await db.execute(count_query)

        return result.scalar_one()

    async def _count_indexed_repository_issues(
        self,
        db: AsyncSession,
        repository_id: int
    ) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(RepositoryIssue)
            .where(RepositoryIssue.repository_id == repository_id)
        )

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
