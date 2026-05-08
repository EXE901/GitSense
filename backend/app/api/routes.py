from fastapi import APIRouter
from app.services.github_service import GitHubService

router = APIRouter()

github_service = GitHubService()


@router.get("/health")
async def health_check():

    return {
        "status": "healthy"
    }


@router.get("/scrape/{owner}/{repo}")
async def scrape_repo(owner: str, repo: str):

    issues = await github_service.fetch_issues(
        owner=owner,
        repo=repo
    )

    return {
        "repo": f"{owner}/{repo}",
        "total_issues": len(issues),
        "issues": issues[:5]
    }