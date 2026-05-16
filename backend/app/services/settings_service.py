from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.settings import UserSettingsResponse, UserSettingsUpdateRequest
from app.services.account_access_service import AccountAccessService
from app.services.ownership_service import OwnershipContext


class SettingsService:
    def __init__(self) -> None:
        self.access_service = AccountAccessService()

    async def get_settings(
        self,
        db: AsyncSession,
        current_user: User,
        ownership_context: OwnershipContext,
    ) -> UserSettingsResponse:
        settings = await self._get_or_create_settings(db, current_user.id)
        usage = await self.access_service.get_usage_summary(
            db=db,
            current_user=current_user,
            ownership_context=ownership_context,
        )

        return self._to_response(
            user=current_user,
            settings=settings,
            usage=usage,
        )

    async def update_settings(
        self,
        db: AsyncSession,
        current_user: User,
        ownership_context: OwnershipContext,
        payload: UserSettingsUpdateRequest,
    ) -> UserSettingsResponse:
        settings = await self._get_or_create_settings(db, current_user.id)

        if payload.workspace:
            if payload.workspace.default_repository_scope is not None:
                value = payload.workspace.default_repository_scope.strip()
                settings.default_repository_scope = value or None

            if payload.workspace.remember_last_workspace is not None:
                settings.remember_last_workspace = payload.workspace.remember_last_workspace

            if payload.workspace.pinned_repositories is not None:
                settings.pinned_repositories = payload.workspace.pinned_repositories.strip() or None

            if payload.workspace.auto_sync_watched_repos is not None:
                settings.auto_sync_watched_repos = payload.workspace.auto_sync_watched_repos

            if payload.workspace.sync_interval is not None:
                settings.sync_interval = payload.workspace.sync_interval.strip() or "manual"

            if payload.workspace.dashboard_layout is not None:
                settings.dashboard_layout = payload.workspace.dashboard_layout.strip() or "balanced"

        if payload.notifications:
            if payload.notifications.sync_notifications is not None:
                settings.sync_notifications = payload.notifications.sync_notifications

            if payload.notifications.stale_issue_alerts is not None:
                settings.stale_issue_alerts = payload.notifications.stale_issue_alerts

            if payload.notifications.future_ai_insight_preferences is not None:
                settings.future_ai_insight_preferences = payload.notifications.future_ai_insight_preferences

            if payload.notifications.spike_detection_alerts is not None:
                settings.spike_detection_alerts = payload.notifications.spike_detection_alerts

            if payload.notifications.email_notifications is not None:
                settings.email_notifications = payload.notifications.email_notifications

            if payload.notifications.browser_notifications is not None:
                settings.browser_notifications = payload.notifications.browser_notifications

            if payload.notifications.digest_frequency is not None:
                settings.digest_frequency = payload.notifications.digest_frequency.strip() or "weekly"

        if payload.appearance:
            if payload.appearance.reduced_motion is not None:
                settings.reduced_motion = payload.appearance.reduced_motion

            if payload.appearance.compact_dashboard_mode is not None:
                settings.compact_dashboard_mode = payload.appearance.compact_dashboard_mode

            if payload.appearance.chart_animations is not None:
                settings.chart_animations = payload.appearance.chart_animations

            if payload.appearance.dashboard_density is not None:
                settings.dashboard_density = payload.appearance.dashboard_density.strip() or "comfortable"

            if payload.appearance.sidebar_collapse_memory is not None:
                settings.sidebar_collapse_memory = payload.appearance.sidebar_collapse_memory

            if payload.appearance.theme_preference is not None:
                settings.theme_preference = payload.appearance.theme_preference.strip() or "dark"

        await db.commit()
        await db.refresh(settings)

        return await self.get_settings(
            db=db,
            current_user=current_user,
            ownership_context=ownership_context,
        )

    async def _get_or_create_settings(self, db: AsyncSession, user_id: int) -> UserSettings:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        settings = result.scalar_one_or_none()

        if settings is None:
            settings = UserSettings(user_id=user_id)
            db.add(settings)
            await db.commit()
            await db.refresh(settings)

        return settings

    def _to_response(
        self,
        user: User,
        settings: UserSettings,
        usage: dict,
    ) -> UserSettingsResponse:
        connected_providers = [
            provider
            for provider, connected in {
                "github": bool(user.github_id),
                "google": bool(user.google_id),
            }.items()
            if connected
        ]

        return UserSettingsResponse(
            account={
                "name": user.github_display_name or user.username,
                "email": user.email,
                "username": user.username,
                "auth_provider": user.auth_provider,
                "is_email_verified": user.is_email_verified,
                "pending_email": user.pending_email,
                "pending_email_requested_at": (
                    user.pending_email_requested_at.isoformat()
                    if user.pending_email_requested_at
                    else None
                ),
                "created_at": user.created_at.isoformat(),
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "account_type": "OAuth" if connected_providers else "Email/password",
                "trust_tier": usage["trust_tier"],
                "github_handle": user.github_username,
                "connected_providers": connected_providers,
            },
            workspace={
                "default_repository_scope": settings.default_repository_scope,
                "remember_last_workspace": settings.remember_last_workspace,
                "pinned_repositories": settings.pinned_repositories,
                "auto_sync_watched_repos": settings.auto_sync_watched_repos,
                "sync_interval": settings.sync_interval,
                "dashboard_layout": settings.dashboard_layout,
            },
            notifications={
                "sync_notifications": settings.sync_notifications,
                "stale_issue_alerts": settings.stale_issue_alerts,
                "spike_detection_alerts": settings.spike_detection_alerts,
                "email_notifications": settings.email_notifications,
                "browser_notifications": settings.browser_notifications,
                "digest_frequency": settings.digest_frequency,
                "future_ai_insight_preferences": settings.future_ai_insight_preferences,
            },
            appearance={
                "reduced_motion": settings.reduced_motion,
                "compact_dashboard_mode": settings.compact_dashboard_mode,
                "chart_animations": settings.chart_animations,
                "dashboard_density": settings.dashboard_density,
                "sidebar_collapse_memory": settings.sidebar_collapse_memory,
                "theme_preference": settings.theme_preference,
            },
            security={
                "password_reset_available": user.hashed_password is not None,
                "logout_available": True,
                "connected_providers": connected_providers,
                "last_password_change": user.password_changed_at.isoformat() if user.password_changed_at else None,
            },
            usage=usage,
        )
