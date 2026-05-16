import os
import hashlib
import secrets
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlencode

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth_session import AuthSession
from app.models.email_verification import EmailVerificationToken
from app.models.oauth_state import OAuthState
from app.models.password_reset import PasswordResetToken
from app.models.repository import Repository
from app.models.sync_event import RepositorySyncEvent
from app.models.user import User, utc_now
from app.models.user_settings import UserSettings
from app.schemas.auth import LoginRequest, OAuthStartResponse, SignupRequest, TokenResponse, UserResponse
from app.services.email_service import EmailService
from app.utils.security import (
    create_access_token,
    get_token_expiration_seconds,
    hash_password,
    verify_password,
)


SUPPORTED_OAUTH_PROVIDERS = {"github", "google"}
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"
EMAIL_VERIFICATION_HOURS = 24
OAUTH_STATE_MINUTES = 10
PASSWORD_RESET_MINUTES = 30
EMAIL_RESEND_COOLDOWN_SECONDS = 60

load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


class AuthService:
    def __init__(self) -> None:
        self.email_service = EmailService()

    async def create_user(
        self,
        db: AsyncSession,
        payload: SignupRequest,
        request_context: dict | None = None,
    ) -> TokenResponse:
        await self._ensure_unique_user(db, email=payload.email, username=payload.username)

        user = User(
            email=payload.email,
            username=payload.username,
            hashed_password=hash_password(payload.password),
            auth_provider="email",
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        try:
            await self.send_verification_email(db, user)
        except HTTPException:
            # Account creation should not fail when SMTP is not configured in local/dev.
            pass

        if payload.guest_session_id:
            await self._transfer_guest_repositories(
                db=db,
                guest_session_id=payload.guest_session_id,
                user_id=user.id
            )

        return await self._create_token_response(db, user, request_context)

    async def authenticate_user(
        self,
        db: AsyncSession,
        payload: LoginRequest,
        request_context: dict | None = None,
    ) -> TokenResponse:
        user = await self.get_user_by_email(db, payload.email)

        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account is disabled.",
            )

        if payload.guest_session_id:
            await self._transfer_guest_repositories(
                db=db,
                guest_session_id=payload.guest_session_id,
                user_id=user.id
            )

        user.last_login_at = utc_now()
        await db.commit()
        await db.refresh(user)

        return await self._create_token_response(db, user, request_context)

    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_oauth_start(
        self,
        db: AsyncSession,
        provider: str,
        guest_session_id: str | None = None,
        current_user: User | None = None,
        purpose: str = "login",
    ) -> OAuthStartResponse:
        normalized_provider = provider.lower()

        if normalized_provider not in SUPPORTED_OAUTH_PROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unsupported OAuth provider.",
            )

        oauth_state = await self._create_oauth_state(
            db=db,
            provider=normalized_provider,
            purpose=purpose,
            guest_session_id=guest_session_id,
            user_id=current_user.id if current_user else None,
        )
        authorization_url = self._build_oauth_authorization_url(
            provider=normalized_provider,
            state=oauth_state.id
        )

        if not authorization_url:
            return OAuthStartResponse(
                provider=normalized_provider,
                configured=False,
                message=(
                    f"{normalized_provider.title()} OAuth is prepared but missing provider "
                    "environment configuration."
                ),
            )

        return OAuthStartResponse(
            provider=normalized_provider,
            configured=True,
            authorization_url=authorization_url,
            message=f"Redirect to {normalized_provider.title()} to continue sign-in.",
        )

    async def _ensure_unique_user(self, db: AsyncSession, email: str, username: str) -> None:
        existing_email = await db.execute(select(User).where(User.email == email))

        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        existing_username = await db.execute(select(User).where(User.username == username))

        if existing_username.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This username is already taken.",
            )

    async def _create_token_response(
        self,
        db: AsyncSession,
        user: User,
        request_context: dict | None = None,
    ) -> TokenResponse:
        session = AuthSession(
            id=secrets.token_urlsafe(24),
            user_id=user.id,
            user_agent=(request_context or {}).get("user_agent"),
            ip_address=(request_context or {}).get("ip_address"),
            device_label=self._build_device_label((request_context or {}).get("user_agent")),
        )
        db.add(session)
        await db.commit()

        access_token = create_access_token(
            subject=str(user.id),
            extra_claims={"sid": session.id}
        )

        return TokenResponse(
            access_token=access_token,
            expires_in=get_token_expiration_seconds(),
            user=self.to_user_response(user),
        )

    def to_user_response(self, user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            auth_provider=user.auth_provider,
            profile_image=user.profile_image,
            github_id=user.github_id,
            github_username=user.github_username,
            github_profile_url=user.github_profile_url,
            github_avatar_url=user.github_avatar_url,
            github_display_name=user.github_display_name,
            is_email_verified=user.is_email_verified,
            is_active=user.is_active,
            pending_email=user.pending_email,
            pending_email_requested_at=user.pending_email_requested_at,
            created_at=user.created_at,
            last_login_at=user.last_login_at,
        )

    def _build_oauth_authorization_url(
        self,
        provider: str,
        state: str | None = None
    ) -> str | None:
        if provider == "github":
            client_id = self._get_env("GITHUB_CLIENT_ID", "GITHUB_OAUTH_CLIENT_ID")
            client_secret = self._get_env("GITHUB_CLIENT_SECRET", "GITHUB_OAUTH_CLIENT_SECRET")
            redirect_uri = self._get_env("GITHUB_REDIRECT_URI", "GITHUB_OAUTH_REDIRECT_URI")

            if not client_id or not client_secret or not redirect_uri:
                return None

            query_params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "read:user user:email",
            }

            if state:
                query_params["state"] = state

            query = urlencode(query_params)
            return f"https://github.com/login/oauth/authorize?{query}"

        client_id = self._get_env("GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID")
        client_secret = self._get_env("GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET")
        redirect_uri = self._get_env("GOOGLE_REDIRECT_URI", "GOOGLE_OAUTH_REDIRECT_URI")

        if not client_id or not client_secret or not redirect_uri:
            return None

        query = urlencode(
            {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "access_type": "offline",
                "prompt": "consent",
                "state": state or "",
            }
        )
        return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

    async def _exchange_github_code(self, code: str) -> str:
        client_id = self._get_env("GITHUB_CLIENT_ID", "GITHUB_OAUTH_CLIENT_ID")
        client_secret = self._get_env("GITHUB_CLIENT_SECRET", "GITHUB_OAUTH_CLIENT_SECRET")
        redirect_uri = self._get_env("GITHUB_REDIRECT_URI", "GITHUB_OAUTH_REDIRECT_URI")

        if not client_id or not client_secret or not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitHub OAuth is not configured.",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    GITHUB_TOKEN_URL,
                    headers={"Accept": "application/json"},
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "redirect_uri": redirect_uri,
                    },
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach GitHub OAuth. Please try again.",
            ) from exc

        if not response.is_success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub OAuth token exchange failed.",
            )

        payload = response.json()

        if payload.get("error"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=payload.get("error_description") or "GitHub OAuth code is invalid or expired.",
            )

        access_token = payload.get("access_token")

        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub OAuth response did not include an access token.",
            )

        return access_token

    async def _fetch_github_profile(self, access_token: str) -> dict:
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                user_response = await client.get(GITHUB_USER_URL, headers=headers)
                email_response = await client.get(GITHUB_EMAILS_URL, headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to fetch GitHub profile. Please try again.",
            ) from exc

        if not user_response.is_success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub profile request failed.",
            )

        user_payload = user_response.json()
        github_id = user_payload.get("id")
        github_login = user_payload.get("login")

        if github_id is None or not github_login:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub profile response was missing required account fields.",
            )

        email = user_payload.get("email")

        if not email and email_response.is_success:
            email = self._extract_primary_github_email(email_response.json())

        return {
            "github_id": str(github_id),
            "username": github_login,
            "display_name": user_payload.get("name"),
            "profile_url": user_payload.get("html_url"),
            "avatar_url": user_payload.get("avatar_url"),
            "email": str(email).lower() if email else None,
        }

    def _extract_primary_github_email(self, emails: list[dict]) -> str | None:
        for email_record in emails:
            if email_record.get("primary") and email_record.get("verified"):
                return email_record.get("email")

        for email_record in emails:
            if email_record.get("verified"):
                return email_record.get("email")

        return None

    async def _get_or_create_github_user(
        self,
        db: AsyncSession,
        github_profile: dict
    ) -> User:
        github_id = github_profile["github_id"]
        email = github_profile.get("email") or self._build_github_fallback_email(github_id)

        result = await db.execute(
            select(User).where(User.github_id == github_id)
        )
        user = result.scalar_one_or_none()

        if user is None and github_profile.get("email"):
            result = await db.execute(
                select(User).where(User.email == github_profile["email"])
            )
            user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=email,
                username=await self._build_unique_username(db, github_profile["username"]),
                hashed_password=None,
                auth_provider="github",
            )
            db.add(user)
        elif github_profile.get("email") and self._is_github_fallback_email(user.email):
            existing_email_user = await self.get_user_by_email(db, github_profile["email"])

            if existing_email_user is None:
                user.email = github_profile["email"]

        user.github_id = github_profile["github_id"]
        user.github_username = github_profile["username"]
        user.github_profile_url = github_profile["profile_url"]
        user.github_avatar_url = github_profile["avatar_url"]
        user.github_display_name = github_profile["display_name"]
        user.profile_image = github_profile["avatar_url"]
        user.is_email_verified = True

        if user.auth_provider == "email":
            user.auth_provider = "email+github"

        await db.commit()
        await db.refresh(user)

        return user

    def _build_github_fallback_email(self, github_id: str) -> str:
        return f"github-{github_id}@users.noreply.gitsense.local"

    def _is_github_fallback_email(self, email: str) -> bool:
        return email.endswith("@users.noreply.gitsense.local")

    async def _build_unique_username(self, db: AsyncSession, base_username: str) -> str:
        normalized_username = base_username.strip().lower().replace(" ", "-")[:72] or "github-user"
        candidate = normalized_username
        suffix = 1

        while True:
            result = await db.execute(select(User).where(User.username == candidate))

            if result.scalar_one_or_none() is None:
                return candidate

            suffix += 1
            candidate = f"{normalized_username}-{suffix}"[:80]

    def _get_env(self, *names: str, default: str | None = None) -> str | None:
        for name in names:
            value = os.getenv(name)

            if value:
                return value

        return default

    async def _transfer_guest_repositories(
        self,
        db: AsyncSession,
        guest_session_id: str,
        user_id: int
    ) -> None:
        result = await db.execute(
            select(Repository).where(Repository.guest_session_id == guest_session_id)
        )

        guest_repositories = result.scalars().all()

        for repository in guest_repositories:
            existing_user_repository = await db.execute(
                select(Repository).where(
                    Repository.user_id == user_id,
                    Repository.full_name == repository.full_name
                )
            )

            if existing_user_repository.scalar_one_or_none():
                continue

            repository.user_id = user_id
            repository.guest_session_id = None
            repository.is_demo = False
            repository.expires_at = None

        await db.commit()
    async def authenticate_github_oauth(
        self,
        db: AsyncSession,
        code: str,
        guest_session_id: str | None = None,
        request_context: dict | None = None,
    ) -> TokenResponse:
        github_access_token = await self._exchange_github_code(code)
        github_profile = await self._fetch_github_profile(github_access_token)
        user = await self._get_or_create_github_user(db, github_profile)

        if guest_session_id:
            await self._transfer_guest_repositories(
                db=db,
                guest_session_id=guest_session_id,
                user_id=user.id
            )

        return await self._create_token_response(db, user, request_context)

    async def authenticate_oauth_callback(
        self,
        db: AsyncSession,
        provider: str,
        code: str,
        state: str | None = None,
        request_context: dict | None = None,
    ) -> dict:
        normalized_provider = provider.lower()
        oauth_state = await self._consume_oauth_state(db, normalized_provider, state)

        if normalized_provider == "github":
            access_token = await self._exchange_github_code(code)
            profile = await self._fetch_github_profile(access_token)
        elif normalized_provider == "google":
            access_token = await self._exchange_google_code(code)
            profile = await self._fetch_google_profile(access_token)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unsupported OAuth provider.",
            )

        if oauth_state and oauth_state.purpose == "link":
            user = await self.get_user_by_id(db, oauth_state.user_id)

            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Link session expired. Sign in and try again.",
                )

            await self.link_provider(db, user, normalized_provider, profile)
            return {
                "purpose": "link",
                "provider": normalized_provider,
                "message": f"{normalized_provider.title()} account linked successfully.",
            }

        if normalized_provider == "github":
            user = await self._get_or_create_github_user(db, profile)
        else:
            user = await self._get_or_create_google_user(db, profile)

        guest_session_id = oauth_state.guest_session_id if oauth_state else state

        if guest_session_id:
            await self._transfer_guest_repositories(
                db=db,
                guest_session_id=guest_session_id,
                user_id=user.id
            )

        return {
            "purpose": "login",
            "provider": normalized_provider,
            "token_response": await self._create_token_response(db, user, request_context),
        }

    async def send_verification_email(self, db: AsyncSession, user: User) -> None:
        target_email = user.pending_email or user.email
        existing_token = await db.execute(
            select(EmailVerificationToken)
            .where(
                EmailVerificationToken.user_id == user.id,
                EmailVerificationToken.email == target_email,
                EmailVerificationToken.consumed_at.is_(None),
            )
            .order_by(EmailVerificationToken.created_at.desc())
        )
        latest_token = existing_token.scalars().first()

        if latest_token and latest_token.created_at > utc_now() - timedelta(seconds=EMAIL_RESEND_COOLDOWN_SECONDS):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification email.",
            )

        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)
        verification_token = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            email=target_email,
            expires_at=utc_now() + timedelta(hours=EMAIL_VERIFICATION_HOURS),
        )
        db.add(verification_token)
        await db.commit()

        await self.email_service.send_verification_email(
            to_email=target_email,
            verification_url=self._build_email_verification_url(raw_token),
        )

    async def verify_email(self, db: AsyncSession, token: str) -> User:
        result = await db.execute(
            select(EmailVerificationToken).where(
                EmailVerificationToken.token_hash == self._hash_token(token)
            )
        )
        verification_token = result.scalar_one_or_none()

        if (
            verification_token is None
            or verification_token.consumed_at is not None
            or verification_token.expires_at <= utc_now()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link is invalid or expired.",
            )

        user = await self.get_user_by_id(db, verification_token.user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link no longer matches this account email.",
            )

        if user.pending_email == verification_token.email:
            existing_email = await self.get_user_by_email(db, verification_token.email)

            if existing_email and existing_email.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This email address is already in use.",
                )

            user.email = verification_token.email
            user.pending_email = None
            user.pending_email_requested_at = None
        elif user.email != verification_token.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link no longer matches this account email.",
            )

        user.is_email_verified = True
        verification_token.consumed_at = utc_now()
        await db.commit()
        await db.refresh(user)

        return user

    async def _exchange_google_code(self, code: str) -> str:
        client_id = self._get_env("GOOGLE_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_ID")
        client_secret = self._get_env("GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET")
        redirect_uri = self._get_env("GOOGLE_REDIRECT_URI", "GOOGLE_OAUTH_REDIRECT_URI")

        if not client_id or not client_secret or not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google OAuth is not configured.",
            )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach Google OAuth. Please try again.",
            ) from exc

        if not response.is_success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google OAuth token exchange failed.",
            )

        payload = response.json()
        access_token = payload.get("access_token")

        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google OAuth response did not include an access token.",
            )

        return access_token

    async def _fetch_google_profile(self, access_token: str) -> dict:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    GOOGLE_USERINFO_URL,
                    headers={"Authorization": f"Bearer {access_token}"},
                )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to fetch Google profile. Please try again.",
            ) from exc

        if not response.is_success:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google profile request failed.",
            )

        payload = response.json()
        google_id = payload.get("sub")
        email = payload.get("email")

        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Google profile response was missing required account fields.",
            )

        return {
            "google_id": str(google_id),
            "email": str(email).lower(),
            "username": str(email).split("@", 1)[0],
            "display_name": payload.get("name"),
            "avatar_url": payload.get("picture"),
            "email_verified": bool(payload.get("email_verified", True)),
        }

    async def _get_or_create_google_user(self, db: AsyncSession, google_profile: dict) -> User:
        google_id = google_profile["google_id"]
        result = await db.execute(select(User).where(User.google_id == google_id))
        user = result.scalar_one_or_none()

        if user is None:
            result = await db.execute(select(User).where(User.email == google_profile["email"]))
            user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=google_profile["email"],
                username=await self._build_unique_username(db, google_profile["username"]),
                hashed_password=None,
                auth_provider="google",
            )
            db.add(user)

        user.google_id = google_id
        user.profile_image = google_profile["avatar_url"] or user.profile_image
        user.github_display_name = google_profile["display_name"] or user.github_display_name
        user.is_email_verified = True
        self._refresh_auth_provider(user)

        await db.commit()
        await db.refresh(user)

        return user

    async def link_provider(
        self,
        db: AsyncSession,
        user: User,
        provider: str,
        profile: dict,
    ) -> User:
        if provider == "github":
            await self._ensure_provider_available(
                db=db,
                provider_field=User.github_id,
                provider_id=profile["github_id"],
                current_user_id=user.id,
            )
            user.github_id = profile["github_id"]
            user.github_username = profile["username"]
            user.github_profile_url = profile["profile_url"]
            user.github_avatar_url = profile["avatar_url"]
            user.github_display_name = profile["display_name"] or user.github_display_name
            user.profile_image = profile["avatar_url"] or user.profile_image
            user.is_email_verified = True
        elif provider == "google":
            await self._ensure_provider_available(
                db=db,
                provider_field=User.google_id,
                provider_id=profile["google_id"],
                current_user_id=user.id,
            )
            user.google_id = profile["google_id"]
            user.profile_image = profile["avatar_url"] or user.profile_image
            user.github_display_name = profile["display_name"] or user.github_display_name
            user.is_email_verified = True
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unsupported provider.",
            )

        self._refresh_auth_provider(user)
        await db.commit()
        await db.refresh(user)

        return user

    async def unlink_provider(self, db: AsyncSession, user: User, provider: str) -> User:
        normalized_provider = provider.lower()

        if normalized_provider == "github":
            if not user.github_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="GitHub is not linked.")

            self._ensure_can_unlink(user, "github")
            user.github_id = None
            user.github_username = None
            user.github_profile_url = None
            user.github_avatar_url = None
        elif normalized_provider == "google":
            if not user.google_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google is not linked.")

            self._ensure_can_unlink(user, "google")
            user.google_id = None
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unsupported provider.")

        self._refresh_auth_provider(user)
        await db.commit()
        await db.refresh(user)

        return user

    async def update_account_profile(
        self,
        db: AsyncSession,
        user: User,
        username: str | None = None,
        display_name: str | None = None,
        email: str | None = None,
    ) -> User:
        if username:
            normalized_username = username.strip()

            if normalized_username != user.username:
                existing_username = await db.execute(
                    select(User).where(User.username == normalized_username, User.id != user.id)
                )

                if existing_username.scalar_one_or_none():
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This username is already taken.")

                user.username = normalized_username

        if display_name is not None:
            user.github_display_name = display_name.strip() or None

        if email:
            normalized_email = email.strip().lower()

            if "@" not in normalized_email or "." not in normalized_email.rsplit("@", 1)[-1]:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid email address.")

            if normalized_email != user.email:
                existing_email = await db.execute(
                    select(User).where(
                        User.id != user.id,
                        or_(User.email == normalized_email, User.pending_email == normalized_email),
                    )
                )

                if existing_email.scalar_one_or_none():
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

                user.pending_email = normalized_email
                user.pending_email_requested_at = utc_now()

        await db.commit()
        await db.refresh(user)

        if email:
            try:
                await self.send_verification_email(db, user)
            except HTTPException:
                pass

        return user

    async def delete_account(
        self,
        db: AsyncSession,
        user: User,
        confirmation: str,
        password: str | None = None,
    ) -> None:
        if confirmation != "DELETE MY ACCOUNT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Type "DELETE MY ACCOUNT" to confirm account deletion.',
            )

        if user.hashed_password and not verify_password(password or "", user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Enter your password to delete this account.",
            )

        for model in (
            Repository,
            UserSettings,
            EmailVerificationToken,
            OAuthState,
            RepositorySyncEvent,
            PasswordResetToken,
            AuthSession,
        ):
            result = await db.execute(select(model).where(model.user_id == user.id))

            for record in result.scalars().all():
                await db.delete(record)

        await db.delete(user)
        await db.commit()

    async def request_password_reset(self, db: AsyncSession, email: str) -> None:
        user = await self.get_user_by_email(db, email.strip().lower())

        if not user or not user.hashed_password:
            return

        recent_token = await db.execute(
            select(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.consumed_at.is_(None),
            )
            .order_by(PasswordResetToken.created_at.desc())
        )
        latest_token = recent_token.scalars().first()

        if latest_token and latest_token.created_at > utc_now() - timedelta(seconds=EMAIL_RESEND_COOLDOWN_SECONDS):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another password reset email.",
            )

        raw_token = secrets.token_urlsafe(32)
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=self._hash_token(raw_token),
                expires_at=utc_now() + timedelta(minutes=PASSWORD_RESET_MINUTES),
            )
        )
        await db.commit()
        await self.email_service.send_password_reset_email(
            to_email=user.email,
            reset_url=self._build_password_reset_url(raw_token),
        )

    async def reset_password(self, db: AsyncSession, token: str, password: str) -> None:
        self._validate_password_strength(password)
        result = await db.execute(
            select(PasswordResetToken).where(
                PasswordResetToken.token_hash == self._hash_token(token)
            )
        )
        reset_token = result.scalar_one_or_none()

        if (
            reset_token is None
            or reset_token.consumed_at is not None
            or reset_token.expires_at <= utc_now()
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset link is invalid or expired.",
            )

        user = await self.get_user_by_id(db, reset_token.user_id)

        if not user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account no longer exists.")

        user.hashed_password = hash_password(password)
        user.password_changed_at = utc_now()
        reset_token.consumed_at = utc_now()
        await self._revoke_user_sessions(db, user.id)
        await db.commit()

    async def get_sessions(self, db: AsyncSession, user: User, current_session_id: str | None) -> list[dict]:
        result = await db.execute(
            select(AuthSession)
            .where(AuthSession.user_id == user.id)
            .order_by(AuthSession.last_seen_at.desc())
        )
        sessions = result.scalars().all()

        return [
            {
                "id": session.id,
                "device_label": session.device_label,
                "user_agent": session.user_agent,
                "ip_address": session.ip_address,
                "created_at": session.created_at.isoformat(),
                "last_seen_at": session.last_seen_at.isoformat(),
                "revoked_at": session.revoked_at.isoformat() if session.revoked_at else None,
                "is_current": session.id == current_session_id,
            }
            for session in sessions
        ]

    async def revoke_session(self, db: AsyncSession, user: User, session_id: str) -> None:
        result = await db.execute(
            select(AuthSession).where(AuthSession.user_id == user.id, AuthSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session was not found.")

        session.revoked_at = utc_now()
        await db.commit()

    async def revoke_other_sessions(self, db: AsyncSession, user: User, current_session_id: str | None) -> None:
        result = await db.execute(select(AuthSession).where(AuthSession.user_id == user.id))

        for session in result.scalars().all():
            if session.id != current_session_id:
                session.revoked_at = utc_now()

        await db.commit()

    async def validate_session(
        self,
        db: AsyncSession,
        user: User,
        session_id: str | None,
    ) -> None:
        if not session_id:
            return

        result = await db.execute(
            select(AuthSession).where(
                AuthSession.id == session_id,
                AuthSession.user_id == user.id,
                AuthSession.revoked_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This session has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        session.last_seen_at = utc_now()
        await db.commit()

    async def check_username_available(
        self,
        db: AsyncSession,
        username: str,
        current_user: User | None = None,
    ) -> bool:
        normalized_username = username.strip()

        if (
            len(normalized_username) < 2
            or len(normalized_username) > 80
            or not normalized_username.replace("-", "").replace("_", "").isalnum()
        ):
            return False

        result = await db.execute(select(User).where(User.username == normalized_username))
        existing_user = result.scalar_one_or_none()

        return existing_user is None or (current_user is not None and existing_user.id == current_user.id)

    async def _create_oauth_state(
        self,
        db: AsyncSession,
        provider: str,
        purpose: str,
        guest_session_id: str | None = None,
        user_id: int | None = None,
    ) -> OAuthState:
        oauth_state = OAuthState(
            id=secrets.token_urlsafe(24),
            provider=provider,
            purpose=purpose,
            user_id=user_id,
            guest_session_id=guest_session_id,
            expires_at=utc_now() + timedelta(minutes=OAUTH_STATE_MINUTES),
        )
        db.add(oauth_state)
        await db.commit()

        return oauth_state

    async def _consume_oauth_state(
        self,
        db: AsyncSession,
        provider: str,
        state: str | None,
    ) -> OAuthState | None:
        if not state:
            return None

        result = await db.execute(select(OAuthState).where(OAuthState.id == state))
        oauth_state = result.scalar_one_or_none()

        if oauth_state is None:
            return None

        if oauth_state.provider != provider or oauth_state.consumed_at is not None or oauth_state.expires_at <= utc_now():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth session expired. Please try again.")

        oauth_state.consumed_at = utc_now()
        await db.commit()

        return oauth_state

    async def _ensure_provider_available(
        self,
        db: AsyncSession,
        provider_field,
        provider_id: str,
        current_user_id: int,
    ) -> None:
        result = await db.execute(select(User).where(provider_field == provider_id, User.id != current_user_id))

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This provider account is already linked to another GitSense account.",
            )

    def _ensure_can_unlink(self, user: User, provider: str) -> None:
        remaining_providers = {
            "github": bool(user.github_id),
            "google": bool(user.google_id),
        }
        remaining_providers[provider] = False

        if user.hashed_password or any(remaining_providers.values()):
            return

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add another sign-in method before unlinking this provider.",
        )

    def _refresh_auth_provider(self, user: User) -> None:
        providers: list[str] = []

        if user.hashed_password:
            providers.append("email")

        if user.github_id:
            providers.append("github")

        if user.google_id:
            providers.append("google")

        user.auth_provider = "+".join(providers) or user.auth_provider

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    async def _revoke_user_sessions(self, db: AsyncSession, user_id: int) -> None:
        result = await db.execute(select(AuthSession).where(AuthSession.user_id == user_id))

        for session in result.scalars().all():
            session.revoked_at = utc_now()

    def _validate_password_strength(self, password: str) -> None:
        if (
            len(password) < 12
            or not any(char.islower() for char in password)
            or not any(char.isupper() for char in password)
            or not any(char.isdigit() for char in password)
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password must be at least 12 characters and include uppercase, lowercase, and a number.",
            )

    def _build_device_label(self, user_agent: str | None) -> str:
        if not user_agent:
            return "Unknown device"

        browser = "Browser"
        platform = "Device"
        lowered = user_agent.lower()

        if "edg/" in lowered:
            browser = "Edge"
        elif "chrome/" in lowered:
            browser = "Chrome"
        elif "firefox/" in lowered:
            browser = "Firefox"
        elif "safari/" in lowered:
            browser = "Safari"

        if "windows" in lowered:
            platform = "Windows"
        elif "mac os" in lowered:
            platform = "macOS"
        elif "iphone" in lowered:
            platform = "iPhone"
        elif "android" in lowered:
            platform = "Android"
        elif "linux" in lowered:
            platform = "Linux"

        return f"{browser} on {platform}"

    def _build_email_verification_url(self, token: str) -> str:
        frontend_url = self._get_env(
            "FRONTEND_EMAIL_VERIFICATION_URL",
            default="http://localhost:3000/login"
        )
        separator = "&" if "?" in frontend_url else "?"

        return f"{frontend_url}{separator}verify_token={token}"

    def _build_password_reset_url(self, token: str) -> str:
        frontend_url = self._get_env(
            "FRONTEND_PASSWORD_RESET_URL",
            default="http://localhost:3000/reset-password"
        )
        separator = "&" if "?" in frontend_url else "?"

        return f"{frontend_url}{separator}token={token}"

    def build_frontend_oauth_redirect(
        self,
        token_response: TokenResponse | None = None,
        error_message: str | None = None,
        message: str | None = None,
        redirect_path: str | None = None,
    ) -> str:
        frontend_callback_url = self._get_env(
            "FRONTEND_GITHUB_CALLBACK_URL",
            default="http://localhost:3000/auth/github/callback"
        )

        if error_message:
            fragment = urlencode({"error": error_message})
            return f"{frontend_callback_url}#{fragment}"

        if message:
            fragment = urlencode(
                {
                    "message": message,
                    "redirect": redirect_path or "/settings",
                }
            )
            return f"{frontend_callback_url}#{fragment}"

        if not token_response:
            fragment = urlencode({"error": "GitHub authentication did not return a session."})
            return f"{frontend_callback_url}#{fragment}"

        fragment = urlencode(
            {
                "access_token": token_response.access_token,
                "token_type": token_response.token_type,
                "expires_in": str(token_response.expires_in),
            }
        )
        return f"{frontend_callback_url}#{fragment}"
