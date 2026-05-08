import os
from collections.abc import AsyncGenerator
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"

load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not configured.")

    return _normalize_database_url(database_url)


def _normalize_database_url(database_url: str) -> str:
    normalized_url = database_url

    if normalized_url.startswith("postgresql://"):
        normalized_url = normalized_url.replace(
            "postgresql://",
            "postgresql+asyncpg://",
            1
        )

    return _normalize_asyncpg_query_params(normalized_url)


def _normalize_asyncpg_query_params(database_url: str) -> str:
    parsed_url = urlsplit(database_url)
    query_params = parse_qsl(parsed_url.query, keep_blank_values=True)

    normalized_params = [
        ("ssl", value) if key == "sslmode" else (key, value)
        for key, value in query_params
    ]

    return urlunsplit(
        (
            parsed_url.scheme,
            parsed_url.netloc,
            parsed_url.path,
            urlencode(normalized_params),
            parsed_url.fragment
        )
    )


DATABASE_URL = _get_database_url()

engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
