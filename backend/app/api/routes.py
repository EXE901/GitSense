from fastapi import APIRouter, Depends, HTTPException
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
