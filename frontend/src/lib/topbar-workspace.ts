import {
  fetchAnalyticsDeveloperSummary,
  fetchAnalyticsOverview,
  fetchAnalyticsStaleIssues,
  fetchAuthenticatedGitHubActivity,
  type DashboardOverview,
  type DeveloperSummary,
  type StaleIssue,
} from './analytics';
import {
  fetchStoredIssues,
  type IssueQuery,
  type OwnershipHeaders,
  type StoredIssue,
} from './issues';
import {
  fetchRepositories,
  type RepositoryHistoryItem,
} from './repositories';
import {
  safeExternalHref,
  safeRouteHref,
  sanitizeCsvCell,
  sanitizeFilename,
  sanitizeMarkdown,
  sanitizeText,
} from './share-safety';
import { readLocalNotifications, type LocalNotificationKind } from './notifications-bus';

export type NotificationKind =
  | 'assigned_to_you'
  | 'mentioned'
  | 'new_comment'
  | 'issue_reopened'
  | 'issue_closed'
  | 'label_changed'
  | 'pr_linked'
  | 'review_requested'
  | 'repo_sync_completed'
  | 'repo_sync_failed'
  | 'ai_insight_generated'
  | 'stale_issue_warning'
  | 'security_alert'
  | LocalNotificationKind;

export type WorkspaceNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  timestamp: string;
  href: string;
  repository?: string;
  actor?: {
    name: string;
    avatarUrl?: string | null;
  };
  severity: 'info' | 'success' | 'warning' | 'danger' | 'ai';
};

export type WorkspaceSnapshot = {
  generatedAt: string;
  route: string;
  overview: DashboardOverview | null;
  developerSummary: DeveloperSummary | null;
  repositories: RepositoryHistoryItem[];
  staleIssues: StaleIssue[];
  recentIssues: StoredIssue[];
};

const recentIssueQuery: IssueQuery = {
  repo: '',
  state: '',
  page: 1,
  limit: 25,
  sortBy: 'updated_at',
  sortDirection: 'desc',
};

export async function loadWorkspaceNotifications(
  ownership: OwnershipHeaders,
  route: string,
  signal?: AbortSignal
): Promise<WorkspaceNotification[]> {
  const [repositoriesResult, staleResult, issuesResult, githubResult] = await Promise.allSettled([
    fetchRepositories(ownership, signal),
    fetchAnalyticsStaleIssues(ownership, 14, 8, undefined, signal),
    fetchStoredIssues(recentIssueQuery, ownership, signal),
    ownership.token ? fetchAuthenticatedGitHubActivity(ownership.token, signal) : Promise.resolve(null),
  ]);

  const repositories = repositoriesResult.status === 'fulfilled' ? repositoriesResult.value : [];
  const staleIssues = staleResult.status === 'fulfilled' ? staleResult.value : [];
  const issues = issuesResult.status === 'fulfilled' ? issuesResult.value.issues : [];
  const githubActivity = githubResult.status === 'fulfilled' ? githubResult.value : null;
  const notifications: WorkspaceNotification[] = [];

  for (const repository of repositories.slice(0, 4)) {
    if (!repository.last_synced_at) {
      continue;
    }

    notifications.push({
      id: `repo-sync-completed:${repository.id}:${repository.last_synced_at}`,
      kind: 'repo_sync_completed',
      title: 'Repository sync completed',
      description: `${sanitizeText(repository.full_name)} indexed ${repository.issue_pages_synced} issue page${repository.issue_pages_synced === 1 ? '' : 's'}.`,
      timestamp: repository.last_synced_at,
      href: safeRouteHref(`/repositories?repo=${encodeURIComponent(repository.full_name)}`),
      repository: sanitizeText(repository.full_name),
      severity: 'success',
    });
  }

  for (const issue of staleIssues) {
    notifications.push({
      id: `stale:${issue.repository}:${issue.number}:${issue.updated_at}`,
      kind: 'stale_issue_warning',
      title: 'Stale issue warning',
      description: `#${issue.number} has been quiet for ${issue.days_since_update} days.`,
      timestamp: issue.updated_at,
      href: safeExternalHref(issue.url, `/issues?repo=${encodeURIComponent(issue.repository)}`),
      repository: sanitizeText(issue.repository),
      severity: 'warning',
    });
  }

  for (const issue of issues.slice(0, 8)) {
    notifications.push(issueToNotification(issue, route));
  }

  if (githubActivity?.available && githubActivity.metrics.assigned_issues > 0) {
    notifications.push({
      id: `assigned:${githubActivity.profile?.username ?? 'github'}:${githubActivity.metrics.assigned_issues}`,
      kind: 'assigned_to_you',
      title: 'Assigned GitHub work detected',
      description: `${githubActivity.metrics.assigned_issues} assigned issue${githubActivity.metrics.assigned_issues === 1 ? '' : 's'} found for your linked GitHub identity.`,
      timestamp: new Date().toISOString(),
      href: '/activity',
      actor: {
        name: sanitizeText(githubActivity.profile?.display_name ?? githubActivity.profile?.username ?? 'GitHub', 'GitHub'),
        avatarUrl: safeExternalHref(githubActivity.profile?.avatar_url, ''),
      },
      severity: 'info',
    });
  }

  if (githubActivity?.available && githubActivity.metrics.repositories_participated > 0) {
    notifications.push({
      id: `developer-activity:${githubActivity.profile?.username ?? 'github'}:${githubActivity.metrics.repositories_participated}`,
      kind: 'mentioned',
      title: 'Developer activity refreshed',
      description: `${githubActivity.metrics.repositories_participated} participated repos are feeding your intelligence view.`,
      timestamp: new Date().toISOString(),
      href: '/activity',
      actor: {
        name: sanitizeText(githubActivity.profile?.display_name ?? githubActivity.profile?.username ?? 'GitHub', 'GitHub'),
        avatarUrl: safeExternalHref(githubActivity.profile?.avatar_url, ''),
      },
      severity: 'ai',
    });
  }

  for (const local of readLocalNotifications()) {
    notifications.push({
      id: `local:${local.id}`,
      kind: local.kind,
      title: local.title,
      description: local.description,
      timestamp: local.timestamp,
      href: local.href,
      repository: local.repository,
      severity: local.severity,
    });
  }

  return notifications
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 30);
}

export async function loadWorkspaceSnapshot(
  ownership: OwnershipHeaders,
  route: string,
  signal?: AbortSignal
): Promise<WorkspaceSnapshot> {
  const [overviewResult, summaryResult, repositoriesResult, staleResult, issuesResult] = await Promise.allSettled([
    fetchAnalyticsOverview(ownership, undefined, signal),
    fetchAnalyticsDeveloperSummary(ownership, undefined, signal),
    fetchRepositories(ownership, signal),
    fetchAnalyticsStaleIssues(ownership, 14, 10, undefined, signal),
    fetchStoredIssues(recentIssueQuery, ownership, signal),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    route: safeRouteHref(route),
    overview: overviewResult.status === 'fulfilled' ? overviewResult.value : null,
    developerSummary: summaryResult.status === 'fulfilled' ? summaryResult.value : null,
    repositories: repositoriesResult.status === 'fulfilled' ? repositoriesResult.value.map(sanitizeRepository) : [],
    staleIssues: staleResult.status === 'fulfilled' ? staleResult.value.map(sanitizeStaleIssue) : [],
    recentIssues: issuesResult.status === 'fulfilled' ? issuesResult.value.issues.map(sanitizeIssue) : [],
  };
}

export function buildWorkspaceSummary(snapshot: WorkspaceSnapshot): string {
  const overview = snapshot.overview;
  const summary = snapshot.developerSummary;
  const tracked = overview?.repositories_tracked ?? snapshot.repositories.length;
  const total = overview?.total_issues ?? 0;
  const open = overview?.open_issues ?? 0;
  const closed = overview?.closed_issues ?? 0;
  const stale = overview?.stale_issues_count ?? snapshot.staleIssues.length;
  const ratio = closed > 0 ? (open / closed).toFixed(2) : 'n/a';
  const stalePct = open > 0 ? Math.round((stale / open) * 100) : 0;
  const lines = [
    `Generated: ${new Date(snapshot.generatedAt).toLocaleString()}`,
    `View: ${safeRouteHref(snapshot.route)}`,
    `Tracked repositories: ${tracked}`,
    `Most active repository: ${sanitizeText(summary?.most_active_repository ?? snapshot.repositories[0]?.full_name ?? 'None yet')}`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Total issues | ${total} |`,
    `| Open issues | ${open} |`,
    `| Closed issues | ${closed} |`,
    `| Stale issues (14d+ idle) | ${stale}${open > 0 ? ` (${stalePct}% of open)` : ''} |`,
    `| Open/closed ratio | ${ratio} |`,
  ];

  return lines.join('\n');
}

export function buildExportPayload(snapshot: WorkspaceSnapshot, format: 'json' | 'csv' | 'markdown'): string {
  if (format === 'json') {
    return JSON.stringify(sanitizeSnapshot(snapshot), null, 2);
  }

  if (format === 'csv') {
    const rows = [
      ['repository', 'number', 'title', 'state', 'comments', 'updated_at', 'url'],
      ...snapshot.recentIssues.map((issue) => [
        sanitizeCsvCell(issue.repo),
        String(issue.number),
        sanitizeCsvCell(issue.title),
        sanitizeCsvCell(issue.state),
        String(issue.comments),
        sanitizeCsvCell(issue.updated_at),
        sanitizeCsvCell(safeExternalHref(issue.url, '')),
      ]),
    ];

    return rows.map((row) => row.join(',')).join('\n');
  }

  const repositorySection = snapshot.repositories.length > 0
    ? snapshot.repositories.slice(0, 8).map((repository) =>
        `- **${sanitizeMarkdown(repository.full_name)}** — ${repository.total_issues_count} issue${repository.total_issues_count === 1 ? '' : 's'} indexed`,
      )
    : ['_No repositories indexed in this workspace yet._'];

  const staleSection = snapshot.staleIssues.length > 0
    ? snapshot.staleIssues.map((issue) =>
        `- ${sanitizeMarkdown(issue.repository)}#${issue.number} — ${sanitizeMarkdown(issue.title)} _(quiet ${issue.days_since_update} day${issue.days_since_update === 1 ? '' : 's'})_`,
      )
    : ['_No stale issues detected above the 14-day threshold._'];

  const activitySection = snapshot.recentIssues.length > 0
    ? snapshot.recentIssues.slice(0, 8).map((issue) =>
        `- ${sanitizeMarkdown(issue.repo)}#${issue.number} (${issue.state}) — ${sanitizeMarkdown(issue.title)}`,
      )
    : ['_No recent issue activity captured in this window._'];

  return [
    '# GitSense — Workspace Operational Report',
    '',
    '_Grounded operational snapshot. Generated from real repository data; no figures are fabricated._',
    '',
    '## Workspace Summary',
    '',
    buildWorkspaceSummary(snapshot),
    '',
    '## Tracked Repositories',
    '',
    ...repositorySection,
    '',
    '## Stale Issue Pressure',
    '',
    ...staleSection,
    '',
    '## Recent Issue Activity',
    '',
    ...activitySection,
    '',
    '---',
    '',
    '_Generated by GitSense · engineering intelligence for GitHub workspaces._',
  ].join('\n');
}

export function buildExportFilename(format: 'json' | 'csv' | 'markdown'): string {
  const extension = format === 'markdown' ? 'md' : format;
  const date = new Date().toISOString().slice(0, 10);

  return sanitizeFilename(`gitsense-workspace-${date}.${extension}`);
}

function issueToNotification(issue: StoredIssue, route: string): WorkspaceNotification {
  const isClosed = issue.state === 'closed';
  const hasComments = issue.comments > 0;
  const hasLabels = issue.labels.length > 0;

  if (isClosed) {
    return {
      id: `issue-closed:${issue.repo}:${issue.number}:${issue.updated_at}`,
      kind: 'issue_closed',
      title: 'Issue closed',
      description: `${sanitizeText(issue.repo)}#${issue.number} moved to closed.`,
      timestamp: issue.updated_at,
      href: safeExternalHref(issue.url, `/issues?repo=${encodeURIComponent(issue.repo)}`),
      repository: sanitizeText(issue.repo),
      severity: 'success',
    };
  }

  if (hasComments) {
    return {
      id: `new-comment:${issue.repo}:${issue.number}:${issue.updated_at}`,
      kind: 'new_comment',
      title: 'Comment activity detected',
      description: `${sanitizeText(issue.repo)}#${issue.number} has ${issue.comments} comment${issue.comments === 1 ? '' : 's'}.`,
      timestamp: issue.updated_at,
      href: safeExternalHref(issue.url, `/issues?repo=${encodeURIComponent(issue.repo)}`),
      repository: sanitizeText(issue.repo),
      severity: 'info',
    };
  }

  if (hasLabels) {
    return {
      id: `labels:${issue.repo}:${issue.number}:${issue.updated_at}`,
      kind: 'label_changed',
      title: 'Label context available',
      description: `${sanitizeText(issue.repo)}#${issue.number} is tagged ${issue.labels.slice(0, 3).map((label) => sanitizeText(label)).join(', ')}.`,
      timestamp: issue.updated_at,
      href: safeExternalHref(issue.url, `/issues?repo=${encodeURIComponent(issue.repo)}`),
      repository: sanitizeText(issue.repo),
      severity: 'info',
    };
  }

  return {
    id: `issue-reopened:${issue.repo}:${issue.number}:${issue.updated_at}`,
    kind: 'issue_reopened',
    title: 'Open issue activity',
    description: `${sanitizeText(issue.repo)}#${issue.number} was recently active.`,
    timestamp: issue.updated_at,
    href: safeExternalHref(issue.url, safeRouteHref(route || '/issues')),
    repository: sanitizeText(issue.repo),
    severity: 'info',
  };
}

function sanitizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    ...snapshot,
    route: safeRouteHref(snapshot.route),
    repositories: snapshot.repositories.map(sanitizeRepository),
    staleIssues: snapshot.staleIssues.map(sanitizeStaleIssue),
    recentIssues: snapshot.recentIssues.map(sanitizeIssue),
  };
}

function sanitizeRepository(repository: RepositoryHistoryItem): RepositoryHistoryItem {
  return {
    ...repository,
    full_name: sanitizeText(repository.full_name),
    description: sanitizeText(repository.description),
    html_url: safeExternalHref(repository.html_url, ''),
  };
}

function sanitizeStaleIssue(issue: StaleIssue): StaleIssue {
  return {
    ...issue,
    title: sanitizeText(issue.title),
    repository: sanitizeText(issue.repository),
    url: safeExternalHref(issue.url, ''),
  };
}

function sanitizeIssue(issue: StoredIssue): StoredIssue {
  return {
    ...issue,
    title: sanitizeText(issue.title),
    repo: sanitizeText(issue.repo),
    labels: issue.labels.map((label) => sanitizeText(label)).filter(Boolean),
    url: safeExternalHref(issue.url, ''),
  };
}
