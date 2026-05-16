from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_session_id, get_current_user
from app.database.session import get_db_session
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    OAuthStartResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
    UsernameAvailabilityResponse,
)
from app.schemas.settings import (
    AccountDeleteRequest,
    AccountProfileUpdateRequest,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
)
from app.services.auth_service import AuthService
from app.services.ownership_service import OwnershipContext
from app.services.settings_service import SettingsService


router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()
settings_service = SettingsService()
GUEST_SESSION_COOKIE_NAME = "gitsense_guest_session_id"


def _request_context(request: Request) -> dict:
    return {
        "user_agent": request.headers.get("user-agent"),
        "ip_address": request.client.host if request.client else None,
    }


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    request: Request,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    db: AsyncSession = Depends(get_db_session),
):
    if not payload.guest_session_id and cookie_guest_session_id:
        payload.guest_session_id = cookie_guest_session_id

    return await auth_service.create_user(db, payload, _request_context(request))


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    db: AsyncSession = Depends(get_db_session),
):
    if not payload.guest_session_id and cookie_guest_session_id:
        payload.guest_session_id = cookie_guest_session_id

    return await auth_service.authenticate_user(db, payload, _request_context(request))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return auth_service.to_user_response(current_user)


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    ownership_context = OwnershipContext(
        user_id=current_user.id,
        guest_session_id=None,
        is_demo=False,
        expires_at=None,
    )

    return await settings_service.get_settings(
        db=db,
        current_user=current_user,
        ownership_context=ownership_context,
    )


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings(
    payload: UserSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    ownership_context = OwnershipContext(
        user_id=current_user.id,
        guest_session_id=None,
        is_demo=False,
        expires_at=None,
    )

    return await settings_service.update_settings(
        db=db,
        current_user=current_user,
        ownership_context=ownership_context,
        payload=payload,
    )


@router.post("/verification/resend")
async def resend_verification(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if current_user.is_email_verified and not current_user.pending_email:
        return {
            "message": "Your email is already verified."
        }

    await auth_service.send_verification_email(db, current_user)

    return {
        "message": "Verification email sent."
    }


@router.post("/verification/confirm", response_model=UserResponse)
async def confirm_email_verification(
    token: Annotated[str, Query(min_length=16)],
    db: AsyncSession = Depends(get_db_session),
):
    user = await auth_service.verify_email(db, token)
    return auth_service.to_user_response(user)


@router.patch("/account", response_model=UserResponse)
async def update_account_profile(
    payload: AccountProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    user = await auth_service.update_account_profile(
        db=db,
        user=current_user,
        username=payload.username,
        display_name=payload.display_name,
        email=payload.email,
    )

    return auth_service.to_user_response(user)


@router.delete("/account")
async def delete_account(
    payload: AccountDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    await auth_service.delete_account(
        db=db,
        user=current_user,
        confirmation=payload.confirmation,
        password=payload.password,
    )

    return {"message": "Account deleted."}


@router.get("/username/check", response_model=UsernameAvailabilityResponse)
async def check_username_availability(
    username: Annotated[str, Query(min_length=2, max_length=80)],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    return UsernameAvailabilityResponse(
        username=username.strip(),
        available=await auth_service.check_username_available(db, username, current_user),
    )


@router.get("/providers/{provider}/link/start", response_model=OAuthStartResponse)
async def start_provider_link(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    return await auth_service.get_oauth_start(
        db=db,
        provider=provider,
        current_user=current_user,
        purpose="link",
    )


@router.delete("/providers/{provider}", response_model=UserResponse)
async def unlink_provider(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    user = await auth_service.unlink_provider(
        db=db,
        user=current_user,
        provider=provider,
    )

    return auth_service.to_user_response(user)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    current_session_id: str | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db_session),
):
    if current_session_id:
        await auth_service.revoke_session(db, current_user, current_session_id)

    return {
        "message": "Logged out successfully."
    }


@router.post("/password/forgot")
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db_session),
):
    await auth_service.request_password_reset(db, payload.email)

    return {
        "message": "If an email/password account exists, a reset link has been sent."
    }


@router.post("/password/reset")
async def reset_password(
    payload: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db_session),
):
    await auth_service.reset_password(db, payload.token, payload.password)

    return {
        "message": "Password updated. Please sign in again."
    }


@router.get("/sessions", response_model=list[AuthSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: str | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db_session),
):
    return await auth_service.get_sessions(db, current_user, current_session_id)


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    await auth_service.revoke_session(db, current_user, session_id)

    return {"message": "Session revoked."}


@router.post("/sessions/logout-all")
async def logout_all_other_sessions(
    current_user: User = Depends(get_current_user),
    current_session_id: str | None = Depends(get_current_session_id),
    db: AsyncSession = Depends(get_db_session),
):
    await auth_service.revoke_other_sessions(db, current_user, current_session_id)

    return {"message": "Other sessions signed out."}


@router.get("/oauth/{provider}/start", response_model=OAuthStartResponse)
async def start_oauth(
    provider: str,
    guest_session_id: Annotated[str | None, Query(max_length=64)] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    db: AsyncSession = Depends(get_db_session),
):
    return await auth_service.get_oauth_start(
        db=db,
        provider=provider,
        guest_session_id=guest_session_id or cookie_guest_session_id
    )


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query(max_length=64)] = None,
    error: Annotated[str | None, Query()] = None,
):
    if error:
        return RedirectResponse(
            auth_service.build_frontend_oauth_redirect(
                error_message=f"{provider.title()} sign-in was canceled or denied."
            )
        )

    if not code:
        return RedirectResponse(
            auth_service.build_frontend_oauth_redirect(
                error_message=f"{provider.title()} did not return an authorization code."
            )
        )

    try:
        oauth_result = await auth_service.authenticate_oauth_callback(
            db=db,
            provider=provider,
            code=code,
            state=state,
            request_context=_request_context(request),
        )
    except HTTPException as exc:
        return RedirectResponse(
            auth_service.build_frontend_oauth_redirect(
                error_message=str(exc.detail)
            )
        )

    if oauth_result["purpose"] == "link":
        return RedirectResponse(
            auth_service.build_frontend_oauth_redirect(
                message=oauth_result["message"],
                redirect_path="/settings"
            )
        )

    return RedirectResponse(
        auth_service.build_frontend_oauth_redirect(token_response=oauth_result["token_response"])
    )
