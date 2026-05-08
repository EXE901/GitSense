from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db_session
from app.services.github_service import GitHubService, GitHubServiceError

router = APIRouter()

github_service = GitHubService()


@router.get("/health")
async def health_check():

    return {
        "status": "healthy"
    }


@router.get("/issues")
async def get_stored_issues(
    db: AsyncSession = Depends(get_db_session),
    repo: Annotated[str | None, Query(min_length=1)] = None,
    state: Annotated[Literal["open", "closed"] | None, Query()] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    sort_by: Annotated[
        Literal[
            "created_at",
            "updated_at",
            "comments",
            "number",
            "title",
            "state",
            "repo"
        ],
        Query()
    ] = "updated_at",
    sort_direction: Annotated[Literal["asc", "desc"], Query()] = "desc"
):
    try:
        return await github_service.get_stored_issues(
            db=db,
            repo=repo,
            state=state,
            page=page,
            limit=limit,
            sort_by=sort_by,
            sort_direction=sort_direction
        )
    except GitHubServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message
        ) from exc


@router.get("/scrape/{owner}/{repo}")
async def scrape_repo(
    owner: str,
    repo: str,
    db: AsyncSession = Depends(get_db_session)
):
    try:
        issues = await github_service.fetch_issues(
            owner=owner,
            repo=repo
        )
        await github_service.save_issues(
            db=db,
            issues=issues,
            repository_name=f"{owner}/{repo}"
        )
    except GitHubServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message
        ) from exc

    return {
        "repo": f"{owner}/{repo}",
        "total_issues": len(issues),
        "issues": issues[:5]
    }
