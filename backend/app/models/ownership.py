from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.models.user import utc_now


class OwnershipMixin:
    @declared_attr
    def user_id(cls) -> Mapped[int | None]:
        return mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    @declared_attr
    def guest_session_id(cls) -> Mapped[str | None]:
        return mapped_column(String(64), nullable=True, index=True)

    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
