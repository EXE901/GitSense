import type { PreviewRepositoryResponse } from '@/lib/issues';
import type { DashboardOverview } from '@/lib/analytics';

const STALE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Convert a preview response into the shape MetricsGrid expects so the same
 * grid can render before a repository is actually synced.
 */
export function buildPreviewOverview(preview: PreviewRepositoryResponse): DashboardOverview {
  const totalComments = preview.issues.reduce((sum, issue) => sum + issue.comments, 0);
  const uniqueLabels = new Set(preview.issues.flatMap((issue) => issue.labels));
  const staleCutoff = Date.now() - STALE_WINDOW_MS;
  const staleIssues = preview.issues.filter((issue) => {
    const updatedAt = new Date(issue.updated_at).getTime();
    return issue.state === 'open' && Number.isFinite(updatedAt) && updatedAt < staleCutoff;
  });

  return {
    total_issues: preview.repository.total_issues_count,
    open_issues: preview.repository.open_issues_count,
    closed_issues: preview.repository.closed_issues_count,
    indexed_issues: preview.indexed_issues,
    avg_comments_per_issue:
      preview.issues.length > 0 ? totalComments / preview.issues.length : 0,
    repositories_tracked: 1,
    unique_labels: uniqueLabels.size,
    open_closed_ratio:
      preview.repository.closed_issues_count > 0
        ? preview.repository.open_issues_count / preview.repository.closed_issues_count
        : preview.repository.open_issues_count,
    stale_issues_count: staleIssues.length,
    stars_count: preview.repository.stars_count,
    forks_count: preview.repository.forks_count,
    watchers_count: preview.repository.watchers_count,
  };
}
