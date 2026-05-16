from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


InsightSeverity = Literal["info", "low", "medium", "high"]
InsightTrend = Literal["up", "down", "flat", "none"]
InsightType = Literal[
    "stale_issue_growth",
    "high_open_ratio",
    "bug_label_spike",
    "unlabeled_backlog",
    "inactive_repository",
    "repository_concentration",
    "issue_volume_spike",
    "activity_drop",
    "low_engagement_repository",
    "backlog_growth",
    "discussion_hotspot",
    "single_repository_dominance",
    "workspace_healthy",
]


class InsightMetric(BaseModel):
    """Lightweight value attached to an insight for visual emphasis."""

    label: str
    value: str


class Insight(BaseModel):
    """Structured operational insight derived from workspace analytics."""

    id: str
    type: InsightType
    severity: InsightSeverity
    title: str
    description: str
    recommendation: str
    repository: str | None = None
    trend: InsightTrend = "none"
    confidence: float = Field(ge=0.0, le=1.0)
    metrics: list[InsightMetric] = Field(default_factory=list)
    created_at: datetime


class InsightsResponse(BaseModel):
    """Envelope for the workspace insights feed."""

    insights: list[Insight]
    generated_at: datetime
    workspace_repositories: int
    indexed_issues: int
