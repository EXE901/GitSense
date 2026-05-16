from app.database.base import Base
from app.database.session import engine
from app.models.guest_session import GuestSession  # noqa: F401
from app.models.auth_session import AuthSession  # noqa: F401
from app.models.email_verification import EmailVerificationToken  # noqa: F401
from app.models.insight_event import InsightEvent  # noqa: F401
from app.models.issue import Issue  # noqa: F401
from app.models.oauth_state import OAuthState  # noqa: F401
from app.models.password_reset import PasswordResetToken  # noqa: F401
from app.models.repository import Repository, RepositoryIssue  # noqa: F401
from app.models.sync_event import RepositorySyncEvent  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_settings import UserSettings  # noqa: F401


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(120)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(120)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(40)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_profile_url VARCHAR(500)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_avatar_url VARCHAR(500)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_display_name VARCHAR(120)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email_requested_at TIMESTAMP WITH TIME ZONE"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE"
        )
        user_settings_columns = {
            "pinned_repositories": "VARCHAR(1000)",
            "dashboard_layout": "VARCHAR(40) NOT NULL DEFAULT 'balanced'",
            "sync_interval": "VARCHAR(40) NOT NULL DEFAULT 'manual'",
            "dashboard_density": "VARCHAR(40) NOT NULL DEFAULT 'comfortable'",
            "auto_sync_watched_repos": "BOOLEAN NOT NULL DEFAULT FALSE",
            "spike_detection_alerts": "BOOLEAN NOT NULL DEFAULT FALSE",
            "email_notifications": "BOOLEAN NOT NULL DEFAULT TRUE",
            "browser_notifications": "BOOLEAN NOT NULL DEFAULT FALSE",
            "digest_frequency": "VARCHAR(40) NOT NULL DEFAULT 'weekly'",
            "sidebar_collapse_memory": "BOOLEAN NOT NULL DEFAULT TRUE",
            "theme_preference": "VARCHAR(40) NOT NULL DEFAULT 'dark'",
        }

        for column_name, column_type in user_settings_columns.items():
            await connection.exec_driver_sql(
                f"ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS {column_name} {column_type}"
            )
        await connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_github_username ON users (github_username)"
        )
        await connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_github_id ON users (github_id)"
        )
        await connection.exec_driver_sql(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS description VARCHAR(500)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS html_url VARCHAR(500)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS default_branch VARCHAR(120)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS language VARCHAR(120)"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS stars_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS forks_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS watchers_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS open_issues_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS total_issues_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS closed_issues_count INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS issue_pages_synced INTEGER NOT NULL DEFAULT 0"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS issue_pages_exhausted BOOLEAN NOT NULL DEFAULT FALSE"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS github_updated_at TIMESTAMP WITH TIME ZONE"
        )
        await connection.exec_driver_sql(
            "ALTER TABLE repositories ADD COLUMN IF NOT EXISTS github_pushed_at TIMESTAMP WITH TIME ZONE"
        )
