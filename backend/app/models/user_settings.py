from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.user import utc_now


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    default_repository_scope: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pinned_repositories: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    dashboard_layout: Mapped[str] = mapped_column(String(40), default="balanced", nullable=False)
    sync_interval: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)
    dashboard_density: Mapped[str] = mapped_column(String(40), default="comfortable", nullable=False)
    remember_last_workspace: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_sync_watched_repos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sync_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stale_issue_alerts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    spike_detection_alerts: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    browser_notifications: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    digest_frequency: Mapped[str] = mapped_column(String(40), default="weekly", nullable=False)
    future_ai_insight_preferences: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    compact_dashboard_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    chart_animations: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sidebar_collapse_memory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    theme_preference: Mapped[str] = mapped_column(String(40), default="dark", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
