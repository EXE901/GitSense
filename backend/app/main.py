from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.api.routes import router
from app.database.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="GitHub Issue Intelligence API",
    lifespan=lifespan
)

app.include_router(router)

@app.get("/")
async def root():
    return {
        "message": "GitHub Issue Intelligence API"
    }
