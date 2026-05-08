import os
from pathlib import Path

import httpx

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


class GitHubService:
    BASE_URL = "https://api.github.com"
    ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"

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
                response.raise_for_status()
                issues = response.json()

                if not issues:
                    break

                for issue in issues:
                    if self._is_pull_request(issue):
                        continue

                    issues_data.append(self._format_issue(issue))

        return issues_data

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

    def _load_token_from_environment(self) -> str | None:
        self._load_dotenv_file()
        return os.getenv("GITHUB_TOKEN")

    def _load_dotenv_file(self) -> None:
        if load_dotenv is None:
            return

        load_dotenv(dotenv_path=self.ENV_FILE_PATH, override=False)
