from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.guest_session import GuestSession
from app.models.repository import Repository
from app.models.user import User, utc_now
from app.schemas.guest import GuestUsageResponse, RepositoryResponse


GUEST_REPOSITORY_LIMIT = 3
GUEST_SESSION_DAYS = 7


@dataclass(frozen=True)
class OwnershipContext:
    user_id: int | None
    guest_session_id: str | None
    is_demo: bool
    expires_at: datetime | None


class OwnershipService:
    async def create_or_restore_guest_session(
        self,
        db: AsyncSession,
        guest_session_id: str | None = None
    ) -> GuestUsageResponse:
        guest_session = None

        if guest_session_id:
            guest_session = await self.get_guest_session(db, guest_session_id)

        if guest_session is None:
            guest_session = GuestSession(
                id=uuid4().hex,
                expires_at=utc_now() + timedelta(days=GUEST_SESSION_DAYS)
            )
            db.add(guest_session)
            await db.commit()
            await db.refresh(guest_session)

        return await self.get_guest_usage(db, guest_session)

    async def get_guest_session(self, db: AsyncSession, guest_session_id: str) -> GuestSession | None:
        result = await db.execute(
            select(GuestSession).where(GuestSession.id == guest_session_id)
        )
        guest_session = result.scalar_one_or_none()

        if guest_session and self._is_expired(guest_session.expires_at):
            return None

        return guest_session

    async def resolve_context(
        self,
        db: AsyncSession,
        current_user: User | None,
        guest_session_id: str | None
    ) -> OwnershipContext:
        if current_user:
            return OwnershipContext(
                user_id=current_user.id,
                guest_session_id=None,
                is_demo=False,
                expires_at=None
            )

        if not guest_session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Start a guest session or sign in to sync repositories.",
            )

        guest_session = await self.get_guest_session(db, guest_session_id)

        if not guest_session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session has expired. Start a new demo session to continue.",
            )

        return OwnershipContext(
            user_id=None,
            guest_session_id=guest_session.id,
            is_demo=True,
            expires_at=guest_session.expires_at
        )

    async def enforce_guest_scrape_limit(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        repository_full_name: str
    ) -> None:
        if not context.is_demo or not context.guest_session_id:
            return

        existing_repository = await self.get_repository(db, context, repository_full_name)

        if existing_repository:
            return

        used_repositories = await self.count_guest_repositories(db, context.guest_session_id)

        if used_repositories >= GUEST_REPOSITORY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Guest demo limit reached. Create an account to persist more repositories.",
            )

    async def get_or_create_repository(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        owner: str,
        repo: str
    ) -> Repository:
        full_name = f"{owner}/{repo}"
        repository = await self.get_repository(db, context, full_name)

        if repository is None:
            repository = Repository(
                full_name=full_name,
                owner_name=owner,
                repo_name=repo,
                user_id=context.user_id,
                guest_session_id=context.guest_session_id,
                is_demo=context.is_demo,
                expires_at=context.expires_at,
            )
            db.add(repository)

        repository.last_synced_at = utc_now()
        await db.flush()

        return repository

    async def get_repository(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        full_name: str
    ) -> Repository | None:
        query = select(Repository).where(Repository.full_name == full_name)

        if context.user_id:
            query = query.where(Repository.user_id == context.user_id)
        else:
            query = query.where(Repository.guest_session_id == context.guest_session_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_repositories(
        self,
        db: AsyncSession,
        context: OwnershipContext
    ) -> list[RepositoryResponse]:
        query = select(Repository)

        if context.user_id:
            query = query.where(Repository.user_id == context.user_id)
        else:
            query = query.where(Repository.guest_session_id == context.guest_session_id)

        result = await db.execute(query.order_by(Repository.last_synced_at.desc()))

        return [
            RepositoryResponse(
                id=repository.id,
                full_name=repository.full_name,
                is_demo=repository.is_demo,
                expires_at=repository.expires_at,
                last_synced_at=repository.last_synced_at,
                html_url=repository.html_url,
                description=repository.description,
                stars_count=repository.stars_count,
                forks_count=repository.forks_count,
                watchers_count=repository.watchers_count,
                open_issues_count=repository.open_issues_count,
                total_issues_count=repository.total_issues_count,
                closed_issues_count=repository.closed_issues_count,
                issue_pages_synced=repository.issue_pages_synced,
                issue_pages_exhausted=repository.issue_pages_exhausted,
            )
            for repository in result.scalars().all()
        ]

    async def remove_repository(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        repository_id: int
    ) -> RepositoryResponse:
        repository = await self.get_repository_by_id(
            db=db,
            context=context,
            repository_id=repository_id
        )

        if repository is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository was not found in this workspace.",
            )

        response = RepositoryResponse(
            id=repository.id,
            full_name=repository.full_name,
            is_demo=repository.is_demo,
            expires_at=repository.expires_at,
            last_synced_at=repository.last_synced_at,
            html_url=repository.html_url,
            description=repository.description,
            stars_count=repository.stars_count,
            forks_count=repository.forks_count,
            watchers_count=repository.watchers_count,
            open_issues_count=repository.open_issues_count,
            total_issues_count=repository.total_issues_count,
            closed_issues_count=repository.closed_issues_count,
            issue_pages_synced=repository.issue_pages_synced,
            issue_pages_exhausted=repository.issue_pages_exhausted,
        )

        await db.delete(repository)
        await db.commit()

        return response

    async def get_repository_by_id(
        self,
        db: AsyncSession,
        context: OwnershipContext,
        repository_id: int
    ) -> Repository | None:
        query = select(Repository).where(Repository.id == repository_id)

        if context.user_id:
            query = query.where(Repository.user_id == context.user_id)
        else:
            query = query.where(Repository.guest_session_id == context.guest_session_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_guest_usage_by_id(
        self,
        db: AsyncSession,
        guest_session_id: str
    ) -> GuestUsageResponse:
        guest_session = await self.get_guest_session(db, guest_session_id)

        if not guest_session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Guest session has expired. Start a new demo session to continue.",
            )

        return await self.get_guest_usage(db, guest_session)

    async def get_guest_usage(
        self,
        db: AsyncSession,
        guest_session: GuestSession
    ) -> GuestUsageResponse:
        used_repositories = await self.count_guest_repositories(db, guest_session.id)

        return GuestUsageResponse(
            guest_session_id=guest_session.id,
            repo_limit=GUEST_REPOSITORY_LIMIT,
            used_repositories=used_repositories,
            remaining_repositories=max(GUEST_REPOSITORY_LIMIT - used_repositories, 0),
            expires_at=guest_session.expires_at,
        )

    async def count_guest_repositories(self, db: AsyncSession, guest_session_id: str) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(Repository)
            .where(Repository.guest_session_id == guest_session_id)
        )

        return result.scalar_one()

    def _is_expired(self, expires_at: datetime) -> bool:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at <= utc_now()
