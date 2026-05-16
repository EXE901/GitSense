from datetime import datetime

from pydantic import BaseModel, Field


class GuestSessionRequest(BaseModel):
    guest_session_id: str | None = Field(default=None, max_length=64)


class GuestUsageResponse(BaseModel):
    guest_session_id: str
    repo_limit: int
    used_repositories: int
    remaining_repositories: int
    expires_at: datetime


class RepositoryResponse(BaseModel):
    id: int
    full_name: str
    is_demo: bool
    expires_at: datetime | None
    last_synced_at: datetime | None
    html_url: str | None = None
    description: str | None = None
    stars_count: int = 0
    forks_count: int = 0
    watchers_count: int = 0
    open_issues_count: int = 0
    total_issues_count: int = 0
    closed_issues_count: int = 0
    issue_pages_synced: int = 0
    issue_pages_exhausted: bool = False
