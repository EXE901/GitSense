'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap';
import { BriefingCard } from '@/components/dashboard/briefing-card';
import { ChartsSection } from '@/components/dashboard/charts-section';
import { DeveloperActivityPanel } from '@/components/dashboard/developer-activity-panel';
import { ErrorState } from '@/components/dashboard/empty-state';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { HealthPanel } from '@/components/dashboard/health-panel';
import { InsightTimeline } from '@/components/dashboard/insight-timeline';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { IssuesFeed } from '@/components/dashboard/issues-feed';
import { DashboardSkeleton } from '@/components/dashboard/loading-skeleton';
import { MetricsGrid } from '@/components/dashboard/metrics-grid';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchStoredIssues,
  previewRepository,
  scrapeRepositoryWithOwnership,
  type IssueQuery,
  type IssuesResponse,
  type PreviewRepositoryResponse,
} from '@/lib/issues';
import type { DashboardOverview } from '@/lib/analytics';
import { getUserTrustTier } from '@/lib/settings';
import {
  fetchRepositories,
  removeRepository,
  type RepositoryHistoryItem,
} from '@/lib/repositories';
import { pushLocalNotification, seedDemoNotificationsOnce } from '@/lib/notifications-bus';

type DashboardClientProps = {
  view?: 'dashboard' | 'issues' | 'analytics' | 'activity';
};

const initialQuery: IssueQuery = {
  repo: '',
  state: '',
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortDirection: 'desc',
};

export function DashboardClient({ view = 'dashboard' }: DashboardClientProps) {
  const { guestSession, refreshGuestSession, status, token, user } = useAuth();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get('demo') === '1' && status !== 'authenticated';
  const [query, setQuery] = useState<IssueQuery>(initialQuery);
  const [draftQuery, setDraftQuery] = useState<IssueQuery>(initialQuery);
  const [data, setData] = useState<IssuesResponse | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRepositoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStage, setSyncStage] = useState<string | null>(null);
  const [syncRepositoryName, setSyncRepositoryName] = useState<string | null>(null);
  const [removingRepositoryId, setRemovingRepositoryId] = useState<number | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [recentRepositories, setRecentRepositories] = useState<RepositoryHistoryItem[]>([]);
  const guestSessionId = guestSession?.guest_session_id ?? null;
  const hasOwnershipContext =
    status === 'authenticated'
      ? Boolean(token)
      : status === 'unauthenticated'
        ? Boolean(guestSessionId)
        : false;
  const ownership = useMemo(
    () => ({
      token,
      guestSessionId,
    }),
    [guestSessionId, token]
  );
  const isPreviewMode = Boolean(previewData);
  const activeRepositoryScope = previewData?.repo ?? query.repo.trim();
  const trustTier = getUserTrustTier(user);
  const showVerificationWarning =
    status === 'authenticated' && trustTier === 'email_unverified';
  const isDashboardInitializing = !hasOwnershipContext || (!isPreviewMode && isLoading && !data);

  useEffect(() => {
    if (!hasOwnershipContext || isPreviewMode) {
      return;
    }

    const controller = new AbortController();

    async function loadIssues() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const issuesResponse = await fetchStoredIssues(
          query,
          { token, guestSessionId },
          controller.signal
        );
        setData(issuesResponse);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load stored issues.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadIssues();

    return () => controller.abort();
  }, [guestSessionId, hasOwnershipContext, isPreviewMode, query, refreshToken, token]);

  useEffect(() => {
    if (status !== 'authenticated' || !token) {
      return;
    }

    const controller = new AbortController();

    fetchRepositories({ token }, controller.signal)
      .then((repositories) => setRecentRepositories(repositories))
      .catch(() => setRecentRepositories([]));

    return () => controller.abort();
  }, [refreshToken, status, token]);

  const issues = previewData?.issues ?? data?.issues ?? [];
  const totalIssues = previewData?.total_issues ?? data?.total_issues ?? 0;
  const previewOverview = previewData ? buildPreviewOverview(previewData) : null;
  const previewDistribution = previewData
    ? {
        open: previewData.repository.open_issues_count,
        closed: previewData.repository.closed_issues_count,
      }
    : null;
  const hasPendingFilterChanges =
    draftQuery.repo !== query.repo ||
    draftQuery.state !== query.state ||
    draftQuery.sortBy !== query.sortBy ||
    draftQuery.sortDirection !== query.sortDirection;

  useEffect(() => {
    function refreshIssues() {
      setRefreshToken((current) => current + 1);
    }

    window.addEventListener('gitsense:refresh-issues', refreshIssues);
    return () => window.removeEventListener('gitsense:refresh-issues', refreshIssues);
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      seedDemoNotificationsOnce();
    }
  }, [isDemoMode]);

  function applyFilters() {
    const nextQuery = {
      ...draftQuery,
      page: 1,
    };

    setPreviewData(null);
    setData(null);
    setIsLoading(true);
    setDraftQuery(nextQuery);
    setQuery(nextQuery);
  }

  function resetFilters() {
    setPreviewData(null);
    setData(null);
    setIsLoading(true);
    setDraftQuery(initialQuery);
    setQuery(initialQuery);
  }

  async function handlePreviewRepository(repository: string, page = 1): Promise<boolean> {
    const normalizedRepository = repository.trim();

    setSyncMessage(null);
    setErrorMessage(null);

    if (!normalizedRepository.includes('/')) {
      setErrorMessage('Enter a repository in owner/repo format, for example microsoft/vscode.');
      return false;
    }

    const previewQuery = {
      ...draftQuery,
      repo: normalizedRepository,
      page,
    };

    setIsPreviewing(true);

    try {
      const result = await previewRepository(normalizedRepository, previewQuery);
      setPreviewData(result);
      setData(null);
      setIsLoading(false);
      setQuery(previewQuery);
      setDraftQuery(previewQuery);
      setSyncMessage(
        `Previewing ${result.repo}. This repository is not saved until you sync it to your workspace.`
      );
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to preview repository.');
      return false;
    } finally {
      setIsPreviewing(false);
    }
  }

  function handleScopeRepository(repository: string) {
    const nextQuery = {
      ...query,
      repo: repository,
      page: 1,
    };

    setPreviewData(null);
    setData(null);
    setIsLoading(true);
    setQuery(nextQuery);
    setDraftQuery(nextQuery);
  }

  function handleClearRepositoryScope() {
    const nextQuery = {
      ...query,
      repo: '',
      page: 1,
    };

    setPreviewData(null);
    setData(null);
    setIsLoading(true);
    setQuery(nextQuery);
    setDraftQuery(nextQuery);
  }

  async function handleSyncRepository(repository: string): Promise<boolean> {
    const normalizedRepository = repository.trim();

    setSyncMessage(null);
    setErrorMessage(null);

    if (!normalizedRepository.includes('/')) {
      setErrorMessage('Enter a repository in owner/repo format, for example microsoft/vscode.');
      return false;
    }

    setIsSyncing(true);
    setSyncRepositoryName(normalizedRepository);
    setSyncStage('Fetching repository metadata and issue pages');

    try {
      const result = await scrapeRepositoryWithOwnership(
        normalizedRepository,
        {
          token,
          guestSessionId,
        }
      );
      setSyncStage('Updating workspace analytics');
      setSyncMessage(
        `Indexed ${result.indexed_issues} issues from ${result.repo}. GitHub reports ${result.total_issues.toLocaleString()} total issues.`
      );

      pushLocalNotification({
        kind: 'repository_added',
        title: 'Repository added to workspace',
        description: `${result.repo} indexed ${result.indexed_issues} issues (${result.issue_pages_synced} page${result.issue_pages_synced === 1 ? '' : 's'} synced).`,
        href: `/repositories?repo=${encodeURIComponent(result.repo)}`,
        repository: result.repo,
        severity: 'success',
      });

      if (result.guest_usage) {
        await refreshGuestSession();
        if (result.guest_usage.remaining_repositories <= 1) {
          pushLocalNotification({
            kind: 'guest_limit_warning',
            title: 'Demo workspace nearing its limit',
            description: `${result.guest_usage.remaining_repositories} repository sync${result.guest_usage.remaining_repositories === 1 ? '' : 's'} remaining. Sign up to keep history.`,
            href: '/signup',
            severity: 'warning',
          });
        }
      }

      setPreviewData(null);
      handleScopeRepository(result.repo);
      setRefreshToken((current) => current + 1);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync repository.';
      setErrorMessage(message);
      pushLocalNotification({
        kind: 'repository_sync_failed',
        title: 'Repository sync failed',
        description: `${normalizedRepository}: ${message}`,
        href: '/repositories',
        repository: normalizedRepository,
        severity: 'danger',
      });
      return false;
    } finally {
      setIsSyncing(false);
      setSyncRepositoryName(null);
      setSyncStage(null);
    }
  }

  async function handleRemoveRepository(repository: RepositoryHistoryItem): Promise<void> {
    setErrorMessage(null);
    setSyncMessage(null);
    setRemovingRepositoryId(repository.id);

    try {
      await removeRepository(repository.id, { token, guestSessionId });
      setRecentRepositories((current) =>
        current.filter((item) => item.id !== repository.id)
      );

      if (activeRepositoryScope === repository.full_name) {
        handleClearRepositoryScope();
      } else {
        setData(null);
        setIsLoading(true);
      }

      setSyncMessage(`${repository.full_name} was removed from this workspace.`);
      pushLocalNotification({
        kind: 'repository_removed',
        title: 'Repository removed',
        description: `${repository.full_name} is no longer tracked in this workspace.`,
        href: '/repositories',
        repository: repository.full_name,
        severity: 'info',
      });
      setRefreshToken((current) => current + 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to remove repository from workspace.'
      );
    } finally {
      setRemovingRepositoryId(null);
    }
  }

  const isAuthenticatedEmptyWorkspace =
    status === 'authenticated'
    && view === 'dashboard'
    && !isPreviewMode
    && !isSyncing
    && recentRepositories.length === 0
    && !activeRepositoryScope;

  const showMetrics = view === 'dashboard' || view === 'analytics';
  const showCharts = view === 'dashboard' || view === 'analytics' || view === 'activity';
  const showIssues = view === 'dashboard' || view === 'issues' || view === 'activity';
  const showInsights = (view === 'dashboard' || view === 'analytics') && !isPreviewMode;
  const showHealth = (view === 'dashboard' || view === 'analytics') && !isPreviewMode;
  const showTimeline = (view === 'dashboard' || view === 'analytics' || view === 'activity') && !isPreviewMode;
  const showHeatmap = (view === 'dashboard' || view === 'analytics') && !isPreviewMode;
  const showBriefing = (view === 'dashboard' || view === 'analytics') && !isPreviewMode;

  if (isDashboardInitializing) {
    return (
      <div className="space-y-6">
        <DashboardInitializationBanner />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className={`rounded-xl border p-4 ${
          isDemoMode
            ? 'border-cyan-400/30 bg-cyan-400/[0.07]'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {isDemoMode && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-200">
                  Demo
                </span>
              )}
              {isDemoMode
                ? 'Live demo workspace'
                : status === 'authenticated'
                  ? 'Persistent workspace'
                  : 'Guest demo workspace'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isDemoMode
                ? 'Read-only demo view with seeded notifications and sample analytics. Nothing here is saved to a real account.'
                : status === 'authenticated'
                  ? `Signed in as ${user?.github_username ? `@${user.github_username}` : user?.email}. Repository history is saved to your account.`
                  : 'Explore GitSense with temporary analytics. Sign up when you are ready to keep long-term history.'}
            </p>
          </div>
          {isDemoMode ? (
            <Link
              href="/signup"
              className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-smooth hover:bg-primary/15"
            >
              Connect your GitHub
            </Link>
          ) : (
            status !== 'authenticated' && guestSession && (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary sm:items-end">
                <span>
                  {guestSession.remaining_repositories} of {guestSession.repo_limit} demo repository syncs remaining
                </span>
                {guestSession.remaining_repositories === 0 && (
                  <Link href="/signup" className="font-semibold underline-offset-4 hover:underline">
                    Create an account to keep syncing
                  </Link>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {status === 'authenticated' && (
        <DeveloperActivityPanel token={token} refreshTrigger={refreshToken} />
      )}

      {showVerificationWarning && <VerificationWarningBanner />}

      <FilterBar
        query={draftQuery}
        hasPendingChanges={hasPendingFilterChanges}
        onChange={(updates) => setDraftQuery((current) => ({ ...current, ...updates }))}
        onApply={applyFilters}
        onReset={resetFilters}
        onPreviewRepository={handlePreviewRepository}
        onScopeRepository={handleScopeRepository}
        onClearRepositoryScope={handleClearRepositoryScope}
        onRemoveRepository={handleRemoveRepository}
        onSyncRepository={handleSyncRepository}
        isSyncing={isSyncing}
        isPreviewing={isPreviewing}
        removingRepositoryId={removingRepositoryId}
        activeRepositoryScope={activeRepositoryScope}
        recentRepositories={status === 'authenticated' ? recentRepositories : []}
      />

      {(isPreviewMode || isSyncing) && (
        <RepositoryWorkflowBanner
          isPreviewMode={isPreviewMode}
          repository={syncRepositoryName ?? activeRepositoryScope}
          syncStage={syncStage}
          onSync={() => handleSyncRepository(activeRepositoryScope)}
          isSyncing={isSyncing}
        />
      )}

      {syncMessage && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {syncMessage}
        </div>
      )}

      {errorMessage && (
        <ErrorState
          description={errorMessage}
          onRetry={() => {
            setErrorMessage(null);
            setRefreshToken((current) => current + 1);
          }}
        />
      )}

      {isAuthenticatedEmptyWorkspace && (
        <FirstSyncGuidance
          username={user?.github_username ?? null}
        />
      )}

      {showBriefing && (
        <BriefingCard
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
        />
      )}
      {showHealth && (
        <HealthPanel
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
        />
      )}
      {showMetrics && (
        <MetricsGrid
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
          overviewOverride={previewOverview}
        />
      )}
      {showInsights && (
        <InsightsPanel
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
        />
      )}
      {showTimeline && (
        <InsightTimeline
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
        />
      )}
      {showHeatmap && (
        <ActivityHeatmap
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
        />
      )}
      {showCharts && (
        <ChartsSection
          ownership={ownership}
          refreshTrigger={refreshToken}
          isReady={hasOwnershipContext}
          repo={activeRepositoryScope}
          previewIssues={previewData?.issues ?? null}
          previewDistribution={previewDistribution}
        />
      )}
      {showIssues && (
        <IssuesFeed
          issues={issues}
          isLoading={!isPreviewMode && isLoading}
          page={previewData?.page ?? query.page}
          limit={previewData?.limit ?? query.limit}
          totalIssues={totalIssues}
          onPageChange={(page) => {
            if (previewData) {
              void handlePreviewRepository(previewData.repo, page);
              return;
            }

            setQuery((current) => ({ ...current, page }));
            setDraftQuery((current) => ({ ...current, page }));
          }}
        />
      )}
    </div>
  );
}

function VerificationWarningBanner() {
  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-100">
            Verify your email to unlock unlimited repository synchronization.
          </p>
          <p className="mt-1 text-xs text-amber-100/70">
            Unverified email accounts can sync 3 repositories per hour while GitSense protects workspace reliability.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex w-fit rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold text-amber-100 transition-smooth hover:bg-amber-300/10"
        >
          Review settings
        </Link>
      </div>
    </section>
  );
}

function DashboardInitializationBanner() {
  return (
    <section className="rounded-xl border border-border bg-card p-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Preparing GitSense workspace</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Restoring your session, repository context, and workspace analytics.
          </p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Hydrating
        </div>
      </div>
    </section>
  );
}

function RepositoryWorkflowBanner({
  isPreviewMode,
  repository,
  syncStage,
  isSyncing,
  onSync,
}: {
  isPreviewMode: boolean;
  repository: string;
  syncStage: string | null;
  isSyncing: boolean;
  onSync: () => Promise<boolean>;
}) {
  return (
    <section className="rounded-xl border border-primary/20 bg-primary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            {isSyncing ? 'Repository sync in progress' : 'Repository preview mode'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isSyncing
              ? `${syncStage ?? 'Syncing repository'}${repository ? ` for ${repository}` : ''}.`
              : isPreviewMode
              ? `${repository} is being inspected temporarily. Sync it when you want to save it to your workspace.`
              : syncStage ?? 'Preparing repository synchronization.'}
          </p>
        </div>
        {isPreviewMode && (
          <button
            type="button"
            onClick={() => void onSync()}
            disabled={isSyncing}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync to workspace'}
          </button>
        )}
        {!isPreviewMode && (
          <div className="flex w-fit items-center gap-2 rounded-lg border border-primary/20 bg-background/40 px-3 py-2 text-xs text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            {syncStage ?? 'Syncing'}
          </div>
        )}
      </div>
    </section>
  );
}

function FirstSyncGuidance({ username }: { username: string | null }) {
  const items: { title: string; detail: string }[] = [
    {
      title: 'Backlog pressure',
      detail: 'Stale open issues, age distribution, and unresolved load per repository.',
    },
    {
      title: 'Throughput trend',
      detail: 'Open vs closed velocity over time, including weeks where throughput slipped.',
    },
    {
      title: 'Contributor concentration',
      detail: 'How much workspace activity sits on a small number of contributors.',
    },
    {
      title: 'Operational risk signals',
      detail: 'Recurring patterns the engine flags as worth watching, with severity history.',
    },
  ];

  return (
    <section className="rounded-xl border border-primary/25 bg-primary/[0.06] p-5">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">
          Get your first operational briefing
        </p>
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          {username
            ? `Welcome, @${username}. Sync a repository to start analysis.`
            : 'Sync a repository to start workspace analysis.'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          GitSense reads your synced repositories and produces a grounded operational briefing.
          Nothing is fabricated — every signal traces back to real GitHub data.
        </p>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-lg border border-border/60 bg-background/60 p-3"
          >
            <p className="text-xs font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Enter a repository as <code className="rounded bg-secondary/60 px-1 py-0.5 text-[10px] text-foreground">owner/repo</code>{' '}
        in the filter bar above and choose <span className="font-semibold text-foreground/80">Sync</span> to index it. Preview is also available without saving.
      </p>
    </section>
  );
}

function buildPreviewOverview(preview: PreviewRepositoryResponse): DashboardOverview {
  const totalComments = preview.issues.reduce((sum, issue) => sum + issue.comments, 0);
  const uniqueLabels = new Set(preview.issues.flatMap((issue) => issue.labels));
  const staleCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
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
