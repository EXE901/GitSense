from fastapi import APIRouter, HTTPException
from app.services.github_service import GitHubService, GitHubServiceError

router = APIRouter()

github_service = GitHubService()


@router.get("/health")
async def health_check():

    return {
        "status": "healthy"
    }


@router.get("/scrape/{owner}/{repo}")
async def scrape_repo(owner: str, repo: str):
    try:
        issues = await github_service.fetch_issues(
            owner=owner,
            repo=repo
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
