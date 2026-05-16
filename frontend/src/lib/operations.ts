import type { OwnershipHeaders } from './issues';

export type HealthState = 'healthy' | 'stable' | 'watch' | 'at_risk' | 'no_data';

export type HealthSignalTone = 'positive' | 'watch' | 'negative';

export type HealthSignal = {
  key: string;
  tone: HealthSignalTone;
  message: string;
  weight: number;
};

export type RepositoryHealth = {
  repository: string;
  score: number;
  state: HealthState;
  indexed_issues: number;
  open_issues: number;
  closed_issues: number;
  stale_open_issues: number;
  confidence: number;
  rationale: HealthSignal[];
  last_activity_at: string | null;
};

export type ContributorImbalanceBreakdown = {
  repository: string;
  share: number;
  issue_count: number;
};

export type ContributorImbalance = {
  available: boolean;
  top_repository: string | null;
  top_share: number;
  repository_breakdown: ContributorImbalanceBreakdown[];
};

export type WorkspaceHealthSummary = {
  score: number;
  state: HealthState;
  average_score: number;
  worst_score: number;
  repository_count: number;
  indexed_issues: number;
  state_counts: Record<'healthy' | 'stable' | 'watch' | 'at_risk', number>;
  primary_concern: string | null;
  primary_concern_label: string | null;
  contributor_imbalance: ContributorImbalance;
  generated_at: string;
};

export type WorkspaceHealthResponse = {
  workspace: WorkspaceHealthSummary;
  repositories: RepositoryHealth[];
  generated_at: string;
};

export type InsightHistoryEvent = {
  id: string;
  signature: string;
  type: string;
  repository: string | null;
  severity: 'info' | 'low' | 'medium' | 'high';
  first_severity: 'info' | 'low' | 'medium' | 'high';
  severity_trend: 'improving' | 'worsening' | 'flat';
  title: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

export type InsightHistoryResponse = {
  events: InsightHistoryEvent[];
  total: number;
  generated_at: string;
};

export type HeatmapCell = {
  repository: string;
  open_issues: number;
  closed_issues: number;
  stale_open: number;
  recent_activity: number;
  indexed_issues: number;
  last_synced_at: string | null;
  intensity: {
    activity: number;
    stale: number;
    load: number;
  };
};

export type HeatmapResponse = {
  cells: HeatmapCell[];
  totals: {
    repositories: number;
    indexed_issues: number;
    stale_open: number;
    recent_activity: number;
  };
  max: {
    open_issues: number;
    recent_activity: number;
    stale_open: number;
  };
  generated_at: string;
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

export async function fetchWorkspaceHealth(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal,
): Promise<WorkspaceHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health/workspace${repoParam(repo)}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load workspace health.');
  }

  return response.json();
}

export async function fetchInsightHistory(
  ownership?: OwnershipHeaders,
  limit: number = 25,
  signal?: AbortSignal,
): Promise<InsightHistoryResponse> {
  const response = await fetch(
    `${API_BASE_URL}/insights/history?limit=${limit}`,
    {
      credentials: 'include',
      headers: buildOwnershipHeaders(ownership),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load insight history.');
  }

  const data = (await response.json()) as Partial<InsightHistoryResponse>;
  return {
    events: Array.isArray(data.events) ? data.events : [],
    total: Number.isFinite(data.total) ? Number(data.total) : 0,
    generated_at:
      typeof data.generated_at === 'string'
        ? data.generated_at
        : new Date().toISOString(),
  };
}

export async function fetchActivityHeatmap(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal,
): Promise<HeatmapResponse> {
  const response = await fetch(
    `${API_BASE_URL}/heatmap/activity${repoParam(repo)}`,
    {
      credentials: 'include',
      headers: buildOwnershipHeaders(ownership),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load activity heatmap.');
  }

  return response.json();
}
