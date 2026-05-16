from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    auth_provider: str
    profile_image: str | None
    github_id: str | None = None
    github_username: str | None = None
    github_profile_url: str | None = None
    github_avatar_url: str | None = None
    github_display_name: str | None = None
    is_email_verified: bool
    is_active: bool
    pending_email: str | None = None
    pending_email_requested_at: datetime | None = None
    created_at: datetime | None = None
    last_login_at: datetime | None = None


class SignupRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    guest_session_id: str | None = Field(default=None, max_length=64)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized_email = value.strip().lower()

        if "@" not in normalized_email or "." not in normalized_email.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")

        return normalized_email

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        username = value.strip()

        if not username.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, dashes, and underscores.")

        return username


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    guest_session_id: str | None = Field(default=None, max_length=64)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return value.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class OAuthStartResponse(BaseModel):
    provider: str
    configured: bool
    authorization_url: str | None = None
    message: str


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return value.strip().lower()


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=16, max_length=255)
    password: str = Field(min_length=12, max_length=128)


class UsernameAvailabilityResponse(BaseModel):
    username: str
    available: bool


class AuthSessionResponse(BaseModel):
    id: str
    device_label: str
    user_agent: str | None
    ip_address: str | None
    created_at: str
    last_seen_at: str
    revoked_at: str | None
    is_current: bool
