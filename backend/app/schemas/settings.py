from pydantic import BaseModel, Field


class WorkspaceSettingsPayload(BaseModel):
    default_repository_scope: str | None = Field(default=None, max_length=255)
    remember_last_workspace: bool | None = None
    pinned_repositories: str | None = Field(default=None, max_length=1000)
    auto_sync_watched_repos: bool | None = None
    sync_interval: str | None = Field(default=None, max_length=40)
    dashboard_layout: str | None = Field(default=None, max_length=40)


class NotificationSettingsPayload(BaseModel):
    sync_notifications: bool | None = None
    stale_issue_alerts: bool | None = None
    spike_detection_alerts: bool | None = None
    email_notifications: bool | None = None
    browser_notifications: bool | None = None
    digest_frequency: str | None = Field(default=None, max_length=40)
    future_ai_insight_preferences: bool | None = None


class AppearanceSettingsPayload(BaseModel):
    reduced_motion: bool | None = None
    compact_dashboard_mode: bool | None = None
    chart_animations: bool | None = None
    dashboard_density: str | None = Field(default=None, max_length=40)
    sidebar_collapse_memory: bool | None = None
    theme_preference: str | None = Field(default=None, max_length=40)


class UserSettingsUpdateRequest(BaseModel):
    account: dict | None = None
    workspace: WorkspaceSettingsPayload | None = None
    notifications: NotificationSettingsPayload | None = None
    appearance: AppearanceSettingsPayload | None = None


class UserSettingsResponse(BaseModel):
    account: dict
    workspace: dict
    notifications: dict
    appearance: dict
    security: dict
    usage: dict


class AccountProfileUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=2, max_length=80)
    display_name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, min_length=5, max_length=255)


class AccountDeleteRequest(BaseModel):
    confirmation: str = Field(min_length=12, max_length=64)
    password: str | None = Field(default=None, max_length=128)
