from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repository import Repository
from app.models.sync_event import RepositorySyncEvent
from app.models.user import User, utc_now
from app.services.ownership_service import GUEST_REPOSITORY_LIMIT, OwnershipContext

TrustTier = Literal["guest", "email_unverified", "verified", "oauth_verified"]

UNVERIFIED_EMAIL_HOURLY_SYNC_LIMIT = 3


class AccountAccessService:
    def get_trust_tier(
        self,
        current_user: User | None,
        ownership_context: OwnershipContext | None = None,
    ) -> TrustTier:
        if current_user is None:
            return "guest"

        if current_user.github_id or current_user.google_id:
            return "oauth_verified"

        if current_user.auth_provider in {"github", "google"}:
            return "oauth_verified"

        if current_user.is_email_verified:
            return "verified"

        return "email_unverified"

    async def enforce_repository_sync_limit(
        self,
        db: AsyncSession,
        current_user: User | None,
        ownership_context: OwnershipContext,
        repository_full_name: str,
    ) -> None:
        trust_tier = self.get_trust_tier(current_user, ownership_context)

        if trust_tier == "guest":
            await self._enforce_guest_repository_limit(
                db=db,
                context=ownership_context,
                repository_full_name=repository_full_name,
            )
            return

        if trust_tier == "email_unverified":
            used_syncs = await self._count_recent_user_syncs(
                db=db,
                user_id=ownership_context.user_id,
            )

            if used_syncs >= UNVERIFIED_EMAIL_HOURLY_SYNC_LIMIT:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Verify your email to unlock unlimited repository synchronization.",
                )

    async def record_repository_sync(
        self,
        db: AsyncSession,
        current_user: User | None,
        ownership_context: OwnershipContext,
        repository_full_name: str,
    ) -> None:
        event = RepositorySyncEvent(
            user_id=ownership_context.user_id,
            guest_session_id=ownership_context.guest_session_id,
            repository_full_name=repository_full_name,
            trust_tier=self.get_trust_tier(current_user, ownership_context),
        )
        db.add(event)
        await db.commit()

    async def get_usage_summary(
        self,
        db: AsyncSession,
        current_user: User | None,
        ownership_context: OwnershipContext | None = None,
    ) -> dict:
        trust_tier = self.get_trust_tier(current_user, ownership_context)

        if trust_tier == "guest":
            used_repositories = 0

            if ownership_context and ownership_context.guest_session_id:
                used_repositories = await self._count_guest_repositories(
                    db=db,
                    guest_session_id=ownership_context.guest_session_id,
                )

            return {
                "trust_tier": trust_tier,
                "sync_limit": GUEST_REPOSITORY_LIMIT,
                "sync_limit_window": "total_demo_repositories",
                "syncs_used": used_repositories,
                "remaining_syncs": max(GUEST_REPOSITORY_LIMIT - used_repositories, 0),
                "unlimited": False,
                "reset_at": None,
                "verification_required": True,
                "message": "Guests can sync up to 3 demo repositories.",
            }

        if trust_tier == "email_unverified":
            reset_at = self._hourly_reset_at()
            used_syncs = await self._count_recent_user_syncs(
                db=db,
                user_id=current_user.id if current_user else None,
            )

            return {
                "trust_tier": trust_tier,
                "sync_limit": UNVERIFIED_EMAIL_HOURLY_SYNC_LIMIT,
                "sync_limit_window": "hour",
                "syncs_used": used_syncs,
                "remaining_syncs": max(UNVERIFIED_EMAIL_HOURLY_SYNC_LIMIT - used_syncs, 0),
                "unlimited": False,
                "reset_at": reset_at.isoformat(),
                "verification_required": True,
                "message": "Verify your email to unlock unlimited repository synchronization.",
            }

        return {
            "trust_tier": trust_tier,
            "sync_limit": None,
            "sync_limit_window": None,
            "syncs_used": None,
            "remaining_syncs": None,
            "unlimited": True,
            "reset_at": None,
            "verification_required": False,
            "message": "Unlimited repository synchronization is enabled.",
        }

    async def _enforce_guest_repository_limit(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        repository_full_name: str,
    ) -> None:
        if not context.guest_session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Start a guest session or sign in to sync repositories.",
            )

        existing_repository = await db.execute(
            select(Repository).where(
                Repository.guest_session_id == context.guest_session_id,
                Repository.full_name == repository_full_name,
            )
        )

        if existing_repository.scalar_one_or_none():
            return

        used_repositories = await self._count_guest_repositories(
            db=db,
            guest_session_id=context.guest_session_id,
        )

        if used_repositories >= GUEST_REPOSITORY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guest demo limit reached. Create an account to persist more repositories.",
            )

    async def _count_guest_repositories(self, db: AsyncSession, guest_session_id: str) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(Repository)
            .where(Repository.guest_session_id == guest_session_id)
        )

        return result.scalar_one()

    async def _count_recent_user_syncs(
        self,
        db: AsyncSession,
        user_id: int | None,
    ) -> int:
        if user_id is None:
            return 0

        result = await db.execute(
            select(func.count())
            .select_from(RepositorySyncEvent)
            .where(
                RepositorySyncEvent.user_id == user_id,
                RepositorySyncEvent.created_at >= utc_now() - timedelta(hours=1),
            )
        )

        return result.scalar_one()

    def _hourly_reset_at(self) -> datetime:
        now = utc_now()

        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        return now + timedelta(hours=1)
