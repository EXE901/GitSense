from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


BriefingSource = Literal["llm", "deterministic"]
BriefingTone = Literal["healthy", "stable", "watch", "at_risk", "no_data"]


class BriefingSignal(BaseModel):
    """A compact reference to one deterministic signal the AI narration
    is allowed to mention. Anything not in this list is out of scope."""

    label: str
    detail: str


class WorkspaceBriefing(BaseModel):
    """Operational briefing for a workspace.

    Always grounded in deterministic signals. The ``source`` field tells
    the UI whether the prose came from the LLM provider or the
    fallback summarizer.
    """

    summary: str = Field(min_length=10)
    headline: str
    tone: BriefingTone
    source: BriefingSource
    model: str | None = None
    grounded_in: list[BriefingSignal] = Field(default_factory=list)
    generated_at: datetime
    confidence: float = Field(ge=0.0, le=1.0)
    notes: list[str] = Field(default_factory=list)


class InsightNarration(BaseModel):
    """Compact AI-narrated paragraph interpreting the active insight set."""

    narration: str = Field(min_length=10)
    source: BriefingSource
    model: str | None = None
    generated_at: datetime
    insights_considered: int
    confidence: float = Field(ge=0.0, le=1.0)
