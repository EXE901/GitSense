import type { OwnershipHeaders } from './issues';

export type InsightSeverity = 'info' | 'low' | 'medium' | 'high';
export type InsightTrend = 'up' | 'down' | 'flat' | 'none';
export type InsightType =
  | 'stale_issue_growth'
  | 'high_open_ratio'
  | 'bug_label_spike'
  | 'unlabeled_backlog'
  | 'inactive_repository'
  | 'repository_concentration'
  | 'issue_volume_spike'
  | 'activity_drop'
  | 'low_engagement_repository'
  | 'backlog_growth'
  | 'discussion_hotspot'
  | 'workspace_healthy';

export type InsightMetric = {
  label: string;
  value: string;
};

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendation: string;
  repository: string | null;
  trend: InsightTrend;
  confidence: number;
  metrics: InsightMetric[];
  created_at: string;
};

export type InsightsResponse = {
  insights: Insight[];
  generated_at: string;
  workspace_repositories: number;
  indexed_issues: number;
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

export async function fetchWorkspaceInsights(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal,
): Promise<InsightsResponse> {
  const params = new URLSearchParams();
  if (repo?.trim()) {
    params.set('repo', repo.trim());
  }
  const query = params.toString();
  const url = `${API_BASE_URL}/insights${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load workspace insights.');
  }

  const data = (await response.json()) as Partial<InsightsResponse>;

  return {
    insights: Array.isArray(data.insights) ? data.insights : [],
    generated_at: typeof data.generated_at === 'string' ? data.generated_at : new Date().toISOString(),
    workspace_repositories: Number.isFinite(data.workspace_repositories)
      ? Number(data.workspace_repositories)
      : 0,
    indexed_issues: Number.isFinite(data.indexed_issues) ? Number(data.indexed_issues) : 0,
  };
}
