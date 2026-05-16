from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base
from app.models.user import utc_now


class InsightEvent(Base):
    """Lightweight occurrence record for an insight signal.

    Each ownership scope (user or guest) gets one row per
    (insight_signature, scope). Repeated detections only bump
    ``last_seen_at`` and ``occurrence_count`` so the table stays
    bounded even on long-lived workspaces.
    """

    __tablename__ = "insight_events"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "guest_session_id",
            "signature",
            name="uq_insight_events_scope_signature",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    guest_session_id: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    signature: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    insight_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    repository: Mapped[str | None] = mapped_column(String(255), nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    first_severity: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
