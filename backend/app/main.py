import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.routes import router
from app.database.init_db import init_db


DEFAULT_DEV_ORIGINS = (
    "http://localhost:3000,"
    "http://127.0.0.1:3000"
)


def _parse_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _resolve_allowed_origins() -> list[str]:
    """Resolve allowed CORS origins from environment.

    Production deployments set `CORS_ALLOW_ORIGINS` to a
    comma-separated list of origins, e.g.:

        CORS_ALLOW_ORIGINS=https://gitsense.tech,https://www.gitsense.tech

    Local development falls back to the two localhost origins
    Next.js exposes by default.
    """
    raw = os.getenv("CORS_ALLOW_ORIGINS") or DEFAULT_DEV_ORIGINS
    return _parse_origins(raw)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="GitSense API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_resolve_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "GitSense API"}

@app.get("/health")
async def health():
    return {"status": "ok"}
