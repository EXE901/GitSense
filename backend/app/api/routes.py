from typing import Annotated, Literal

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user, get_optional_current_user
from app.database.session import get_db_session
from app.models.user import User
from app.schemas.guest import GuestSessionRequest
from app.schemas.github_profile import (
    GitHubLinkRequest,
    GitHubProfileResponse,
    GitHubUnlinkRequest,
)
from app.services.ai_briefing_service import AIBriefingService
from app.services.analytics_service import AnalyticsService
from app.services.account_access_service import AccountAccessService
from app.services.github_service import GitHubService, GitHubServiceError
from app.services.health_service import HealthService
from app.services.heatmap_service import HeatmapService
from app.services.insight_engine import InsightEngine
from app.services.insight_history_service import InsightHistoryService
from app.services.ownership_service import OwnershipService
from app.services.signal_bundle_service import SignalBundleService
from app.utils.github_profile_validator import GitHubProfileValidator

router = APIRouter()

github_service = GitHubService()
ownership_service = OwnershipService()
analytics_service = AnalyticsService()
access_service = AccountAccessService()
insight_engine = InsightEngine(analytics_service=analytics_service)
insight_history_service = InsightHistoryService()
health_service = HealthService(analytics_service=analytics_service)
heatmap_service = HeatmapService(analytics_service=analytics_service)
ai_briefing_service = AIBriefingService()
signal_bundle_service = SignalBundleService(
    insight_engine=insight_engine,
    health_service=health_service,
    insight_history_service=insight_history_service,
)
GUEST_SESSION_COOKIE_NAME = "gitsense_guest_session_id"
GUEST_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7


def _resolve_guest_session_id(
    header_guest_session_id: str | None,
    cookie_guest_session_id: str | None
) -> str | None:
    return header_guest_session_id or cookie_guest_session_id


def _set_guest_session_cookie(response: Response, guest_session_id: str) -> None:
    response.set_cookie(
        key=GUEST_SESSION_COOKIE_NAME,
        value=guest_session_id,
        max_age=GUEST_SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
    )


@router.get("/health")
async def health_check():

    return {
        "status": "healthy"
    }


@router.get("/issues")
async def get_stored_issues(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
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
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        await github_service.ensure_issue_pages_for_view(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
            page=page,
            limit=limit
        )

        return await github_service.get_stored_issues(
            db=db,
            ownership_context=ownership_context,
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


@router.get("/preview/{owner}/{repo}")
async def preview_repo(
    owner: str,
    repo: str,
    state: Annotated[Literal["all", "open", "closed"], Query()] = "all",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    sort: Annotated[Literal["created", "updated", "comments"], Query()] = "updated",
    direction: Annotated[Literal["asc", "desc"], Query()] = "desc",
):
    try:
        return await github_service.preview_repository(
            owner=owner,
            repo=repo,
            page=page,
            limit=limit,
            state=state,
            sort=sort,
            direction=direction,
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
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
):
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = await ownership_service.resolve_context(
            db=db,
            current_user=current_user,
            guest_session_id=guest_session_id
        )
        await access_service.enforce_repository_sync_limit(
            db=db,
            current_user=current_user,
            ownership_context=ownership_context,
            repository_full_name=f"{owner}/{repo}"
        )
        repository = await ownership_service.get_or_create_repository(
            db=db,
            context=ownership_context,
            owner=owner,
            repo=repo
        )
        sync_result = await github_service.sync_repository(
            db=db,
            owner=owner,
            repo=repo,
            repository=repository,
        )
        await access_service.record_repository_sync(
            db=db,
            current_user=current_user,
            ownership_context=ownership_context,
            repository_full_name=repository.full_name
        )
    except GitHubServiceError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=exc.message
        ) from exc

    response_payload = {
        "repo": f"{owner}/{repo}",
        "total_issues": repository.total_issues_count,
        "indexed_issues": len(sync_result["issues"]),
        "issue_pages_synced": repository.issue_pages_synced,
        "issue_pages_exhausted": repository.issue_pages_exhausted,
        "repository": {
            "stars": repository.stars_count,
            "forks": repository.forks_count,
            "watchers": repository.watchers_count,
            "open_issues": repository.open_issues_count,
            "closed_issues": repository.closed_issues_count,
            "url": repository.html_url,
        },
        "issues": sync_result["issues"][:5]
    }

    if ownership_context.guest_session_id:
        _set_guest_session_cookie(response, ownership_context.guest_session_id)
        response_payload["guest_usage"] = (
            await ownership_service.get_guest_usage_by_id(
                db=db,
                guest_session_id=ownership_context.guest_session_id
            )
        ).model_dump(mode="json")

    return response_payload


@router.post("/guest/session")
async def create_or_restore_guest_session(
    payload: GuestSessionRequest,
    response: Response,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    db: AsyncSession = Depends(get_db_session)
):
    guest_usage = await ownership_service.create_or_restore_guest_session(
        db=db,
        guest_session_id=payload.guest_session_id or cookie_guest_session_id
    )
    _set_guest_session_cookie(response, guest_usage.guest_session_id)

    return guest_usage


@router.get("/repositories")
async def get_repositories(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
):
    guest_session_id = _resolve_guest_session_id(
        header_guest_session_id,
        cookie_guest_session_id
    )
    ownership_context = await ownership_service.resolve_context(
        db=db,
        current_user=current_user,
        guest_session_id=guest_session_id
    )

    repositories = await ownership_service.get_repositories(
        db=db,
        context=ownership_context
    )

    return {
        "repositories": repositories
    }


@router.delete("/repositories/{repository_id}")
async def remove_repository(
    repository_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
):
    guest_session_id = _resolve_guest_session_id(
        header_guest_session_id,
        cookie_guest_session_id
    )
    ownership_context = await ownership_service.resolve_context(
        db=db,
        current_user=current_user,
        guest_session_id=guest_session_id
    )
    repository = await ownership_service.remove_repository(
        db=db,
        context=ownership_context,
        repository_id=repository_id
    )

    return {
        "removed": True,
        "repository": repository
    }


# ============================================================================
# Analytics Endpoints
# ============================================================================


@router.get("/analytics/overview")
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get high-level dashboard metrics derived from persisted data.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        overview = await analytics_service.get_dashboard_overview(
            db=db,
            ownership_context=ownership_context,
            repo=repo
        )

        return overview
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve analytics overview"
        ) from exc


@router.get("/analytics/timeline")
async def get_analytics_timeline(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    days: Annotated[int, Query(ge=1, le=365)] = 30,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get activity timeline data for chart visualization.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        timeline = await analytics_service.get_activity_timeline(
            db=db,
            ownership_context=ownership_context,
            days=days,
            repo=repo
        )

        return {"timeline": timeline}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve activity timeline"
        ) from exc


@router.get("/analytics/labels")
async def get_analytics_labels(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get label frequency distribution.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        labels = await analytics_service.get_label_distribution(
            db=db,
            ownership_context=ownership_context,
            limit=limit,
            repo=repo
        )

        return {"labels": labels}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve label distribution"
        ) from exc


@router.get("/analytics/repositories")
async def get_analytics_repositories(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get per-repository metrics.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        repositories = await analytics_service.get_repository_metrics(
            db=db,
            ownership_context=ownership_context,
            limit=limit,
            repo=repo
        )

        return {"repositories": repositories}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve repository metrics"
        ) from exc


@router.get("/analytics/issues/distribution")
async def get_analytics_issue_distribution(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get issue count by state (open/closed).
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        distribution = await analytics_service.get_issue_state_distribution(
            db=db,
            ownership_context=ownership_context,
            repo=repo
        )

        return distribution
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve issue distribution"
        ) from exc


@router.get("/analytics/issues/stale")
async def get_analytics_stale_issues(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    days: Annotated[int, Query(ge=1, le=365)] = 14,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get open issues not updated in X days.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        stale_issues = await analytics_service.get_stale_issues(
            db=db,
            ownership_context=ownership_context,
            days=days,
            limit=limit,
            repo=repo
        )

        return {"stale_issues": stale_issues}
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve stale issues"
        ) from exc


@router.get("/analytics/developer/summary")
async def get_analytics_developer_summary(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Get developer contribution summary (foundation for future insights).
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        summary = await analytics_service.get_developer_contribution_summary(
            db=db,
            ownership_context=ownership_context,
            repo=repo
        )

        return summary
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve developer summary"
        ) from exc


@router.get("/analytics/developer/github")
async def get_authenticated_github_activity(
    current_user: User = Depends(get_current_user),
):
    """
    Get contribution activity for the authenticated user's linked GitHub identity.
    """
    return await analytics_service.get_authenticated_github_activity(current_user)


# ============================================================================
# Insights Endpoints
# ============================================================================


@router.get("/insights")
async def get_workspace_insights(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Generate operational engineering insights from the workspace analytics.
    Rule-based, deterministic per inputs. Ownership-scoped.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        result = await insight_engine.generate_workspace_insights(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )

        await insight_history_service.record_occurrences(
            db=db,
            ownership_context=ownership_context,
            insights=result.get("insights", []),
        )

        return result
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate workspace insights"
        ) from exc


@router.get("/insights/history")
async def get_workspace_insights_history(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    """
    Return the recurrence history of operational insights for the
    current workspace, most recent first.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        return await insight_history_service.list_history(
            db=db,
            ownership_context=ownership_context,
            limit=limit,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to load insight history"
        ) from exc


# ============================================================================
# Health + Heatmap Endpoints
# ============================================================================


@router.get("/health/workspace")
async def get_workspace_health(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Return the workspace + per-repository health summary.
    Deterministic. Weighted. Explainable.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        return await health_service.get_workspace_health(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to compute workspace health"
        ) from exc


@router.get("/heatmap/activity")
async def get_activity_heatmap(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Return repository-level activity / stale / load intensities for
    the operational heatmap visualization.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id
            )

        return await heatmap_service.get_activity_heatmap(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to compute activity heatmap"
        ) from exc


# ============================================================================
# AI Narration Endpoints
# ============================================================================


@router.get("/ai/briefing")
async def get_workspace_briefing(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Generate the AI-narrated workspace briefing.

    Grounded strictly in the deterministic signal bundle assembled by
    SignalBundleService. Falls back to a deterministic summary if no
    provider is configured or the LLM call fails.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id,
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id,
            )

        bundle = await signal_bundle_service.build(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )

        return await ai_briefing_service.generate_workspace_briefing(bundle)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate workspace briefing",
        ) from exc


@router.get("/ai/narration")
async def get_insight_narration(
    db: AsyncSession = Depends(get_db_session),
    current_user: User | None = Depends(get_optional_current_user),
    header_guest_session_id: Annotated[str | None, Header(alias="X-Guest-Session-Id")] = None,
    cookie_guest_session_id: Annotated[str | None, Cookie(alias=GUEST_SESSION_COOKIE_NAME)] = None,
    repo: Annotated[str | None, Query(min_length=1)] = None,
):
    """
    Generate a short AI-narrated interpretation of the active insight
    set. Same grounding and fallback semantics as /ai/briefing.
    """
    try:
        guest_session_id = _resolve_guest_session_id(
            header_guest_session_id,
            cookie_guest_session_id,
        )
        ownership_context = None

        if current_user or guest_session_id:
            ownership_context = await ownership_service.resolve_context(
                db=db,
                current_user=current_user,
                guest_session_id=guest_session_id,
            )

        bundle = await signal_bundle_service.build(
            db=db,
            ownership_context=ownership_context,
            repo=repo,
        )

        return await ai_briefing_service.generate_insight_narration(bundle)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate insight narration",
        ) from exc
