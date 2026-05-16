from pydantic import BaseModel, Field, field_validator


class GitHubProfileResponse(BaseModel):
    """GitHub profile information for a user."""
    github_username: str | None = None
    github_profile_url: str | None = None
    github_avatar_url: str | None = None
    github_display_name: str | None = None
    has_profile: bool  # True if any GitHub profile data is linked


class GitHubLinkRequest(BaseModel):
    """Request to link a GitHub username to a user account."""
    github_username: str = Field(min_length=1, max_length=40)

    @field_validator("github_username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        username = value.strip()

        # GitHub username rules: alphanumeric, hyphens, no consecutive hyphens
        if not username:
            raise ValueError("GitHub username cannot be empty.")

        if not all(c.isalnum() or c == "-" for c in username):
            raise ValueError("GitHub username can only contain letters, numbers, and hyphens.")

        if "--" in username:
            raise ValueError("GitHub username cannot contain consecutive hyphens.")

        if username.startswith("-") or username.endswith("-"):
            raise ValueError("GitHub username cannot start or end with a hyphen.")

        return username


class GitHubUnlinkRequest(BaseModel):
    """Request to unlink GitHub profile."""
    confirm: bool = Field(default=False, description="Confirm unlink operation")
