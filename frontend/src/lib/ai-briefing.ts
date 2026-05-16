import type { OwnershipHeaders } from './issues';

export type BriefingSource = 'llm' | 'deterministic';
export type BriefingTone = 'healthy' | 'stable' | 'watch' | 'at_risk' | 'no_data';

export type BriefingSignal = {
  label: string;
  detail: string;
};

export type WorkspaceBriefing = {
  summary: string;
  headline: string;
  tone: BriefingTone;
  source: BriefingSource;
  model: string | null;
  grounded_in: BriefingSignal[];
  generated_at: string;
  confidence: number;
  notes: string[];
};

export type InsightNarration = {
  narration: string;
  source: BriefingSource;
  model: string | null;
  generated_at: string;
  insights_considered: number;
  confidence: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

function buildOwnershipHeaders(ownership?: OwnershipHeaders): HeadersInit {
  const headers: Record<string, string> = {};

  if (ownership?.token) {
    headers.Authorization = `Bearer ${ownership.token}`;
  } else if (ownership?.guestSessionId) {
    headers['X-Guest-Session-Id'] = ownership.guestSessionId;
  }

  return headers;
}

function repoParam(repo?: string): string {
  if (!repo?.trim()) {
    return '';
  }
  return `?repo=${encodeURIComponent(repo.trim())}`;
}

export async function fetchWorkspaceBriefing(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal,
): Promise<WorkspaceBriefing> {
  const response = await fetch(`${API_BASE_URL}/ai/briefing${repoParam(repo)}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load workspace briefing.');
  }

  const data = (await response.json()) as Partial<WorkspaceBriefing>;
  return {
    summary: typeof data.summary === 'string' ? data.summary : '',
    headline: typeof data.headline === 'string' ? data.headline : 'Workspace briefing',
    tone: (data.tone ?? 'no_data') as BriefingTone,
    source: data.source === 'llm' ? 'llm' : 'deterministic',
    model: typeof data.model === 'string' ? data.model : null,
    grounded_in: Array.isArray(data.grounded_in) ? data.grounded_in : [],
    generated_at:
      typeof data.generated_at === 'string'
        ? data.generated_at
        : new Date().toISOString(),
    confidence: Number.isFinite(data.confidence) ? Number(data.confidence) : 0,
    notes: Array.isArray(data.notes) ? data.notes : [],
  };
}

export async function fetchInsightNarration(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal,
): Promise<InsightNarration> {
  const response = await fetch(`${API_BASE_URL}/ai/narration${repoParam(repo)}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load insight narration.');
  }

  const data = (await response.json()) as Partial<InsightNarration>;
  return {
    narration: typeof data.narration === 'string' ? data.narration : '',
    source: data.source === 'llm' ? 'llm' : 'deterministic',
    model: typeof data.model === 'string' ? data.model : null,
    generated_at:
      typeof data.generated_at === 'string'
        ? data.generated_at
        : new Date().toISOString(),
    insights_considered: Number.isFinite(data.insights_considered)
      ? Number(data.insights_considered)
      : 0,
    confidence: Number.isFinite(data.confidence) ? Number(data.confidence) : 0,
  };
}
