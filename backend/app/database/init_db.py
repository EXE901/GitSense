from app.database.base import Base
from app.database.session import engine
from app.models.issue import Issue  # noqa: F401


async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
