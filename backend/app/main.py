from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="GitHub Issue Intelligence API"
)

app.include_router(router)

@app.get("/")
async def root():
    return {
        "message": "GitHub Issue Intelligence API"
    }

