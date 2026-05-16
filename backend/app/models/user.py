from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(String(40), default="email", nullable=False)
    github_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    profile_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Optional GitHub profile linking for developer analytics
    github_username: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True, index=True)
    github_profile_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pending_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pending_email_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
