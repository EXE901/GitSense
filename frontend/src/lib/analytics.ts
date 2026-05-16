import type { OwnershipHeaders } from './issues';

export type DashboardOverview = {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  indexed_issues: number;
  avg_comments_per_issue: number;
  repositories_tracked: number;
  unique_labels: number;
  open_closed_ratio: number;
  stale_issues_count: number;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
};

export type TimelineEntry = {
  date: string;
  open: number;
  closed: number;
};

export type LabelEntry = {
  label: string;
  count: number;
};

export type RepositoryMetric = {
  repository: string;
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  indexed_issues: number;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  issue_pages_synced: number;
  issue_pages_exhausted: boolean;
  avg_comments: number;
  last_activity: string | null;
};

export type IssueDistribution = {
  open: number;
  closed: number;
};

export type StaleIssue = {
  number: number;
  title: string;
  repository: string;
  updated_at: string;
  url: string;
  days_since_update: number;
};

export type DeveloperSummary = {
  total_repositories: number;
  total_issues_tracked: number;
  average_comments_per_issue: number;
  most_active_repository: string | null;
};

export type GitHubActivityItem = {
  id: number;
  number: number;
  title: string;
  state: string;
  repository: string | null;
  url: string | null;
  updated_at: string | null;
  labels: string[];
};

export type GitHubRepositoryActivity = {
  repository: string;
  recent_activity: number;
};

export type AuthenticatedGitHubActivity = {
  linked: boolean;
  available: boolean;
  authenticated_api: boolean;
  message: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    profile_url: string | null;
  } | null;
  metrics: {
    opened_issues: number;
    closed_issues: number;
    assigned_issues: number;
    participated_issues: number;
    repositories_participated: number;
  };
  repositories: GitHubRepositoryActivity[];
  recent_activity: GitHubActivityItem[];
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

export async function fetchAnalyticsOverview(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal
): Promise<DashboardOverview> {
  const params = buildRepoParams(repo);
  const response = await fetch(`${API_BASE_URL}/analytics/overview${params}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load analytics overview.');
  }

  return response.json();
}

export async function fetchAnalyticsTimeline(
  ownership?: OwnershipHeaders,
  days: number = 30,
  repo?: string,
  signal?: AbortSignal
): Promise<TimelineEntry[]> {
  const params = new URLSearchParams({ days: String(days) });
  appendRepoParam(params, repo);
  const response = await fetch(`${API_BASE_URL}/analytics/timeline?${params.toString()}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load activity timeline.');
  }

  const data = await response.json();
  return data.timeline ?? [];
}

export async function fetchAnalyticsLabels(
  ownership?: OwnershipHeaders,
  limit: number = 10,
  repo?: string,
  signal?: AbortSignal
): Promise<LabelEntry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  appendRepoParam(params, repo);
  const response = await fetch(`${API_BASE_URL}/analytics/labels?${params.toString()}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load label distribution.');
  }

  const data = await response.json();
  return data.labels ?? [];
}

export async function fetchAnalyticsRepositories(
  ownership?: OwnershipHeaders,
  limit: number = 10,
  repo?: string,
  signal?: AbortSignal
): Promise<RepositoryMetric[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  appendRepoParam(params, repo);
  const response = await fetch(`${API_BASE_URL}/analytics/repositories?${params.toString()}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load repository metrics.');
  }

  const data = await response.json();
  return data.repositories ?? [];
}

export async function fetchAnalyticsIssueDistribution(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal
): Promise<IssueDistribution> {
  const params = buildRepoParams(repo);
  const response = await fetch(`${API_BASE_URL}/analytics/issues/distribution${params}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load issue distribution.');
  }

  return response.json();
}

export async function fetchAnalyticsStaleIssues(
  ownership?: OwnershipHeaders,
  days: number = 14,
  limit: number = 20,
  repo?: string,
  signal?: AbortSignal
): Promise<StaleIssue[]> {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
  });
  appendRepoParam(params, repo);
  const response = await fetch(`${API_BASE_URL}/analytics/issues/stale?${params.toString()}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load stale issues.');
  }

  const data = await response.json();
  return data.stale_issues ?? [];
}

export async function fetchAnalyticsDeveloperSummary(
  ownership?: OwnershipHeaders,
  repo?: string,
  signal?: AbortSignal
): Promise<DeveloperSummary> {
  const params = buildRepoParams(repo);
  const response = await fetch(`${API_BASE_URL}/analytics/developer/summary${params}`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load developer summary.');
  }

  return response.json();
}

function buildRepoParams(repo?: string): string {
  const params = new URLSearchParams();
  appendRepoParam(params, repo);
  const query = params.toString();

  return query ? `?${query}` : '';
}

function appendRepoParam(params: URLSearchParams, repo?: string): void {
  if (repo?.trim()) {
    params.set('repo', repo.trim());
  }
}

export async function fetchAuthenticatedGitHubActivity(
  token: string,
  signal?: AbortSignal
): Promise<AuthenticatedGitHubActivity> {
  const response = await fetch(`${API_BASE_URL}/analytics/developer/github`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load GitHub contribution activity.');
  }

  return response.json();
}
