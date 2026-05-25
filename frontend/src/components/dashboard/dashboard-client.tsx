'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  DashboardInitializationBanner,
  FirstSyncGuidance,
  RepositoryWorkflowBanner,
  VerificationWarningBanner,
  WorkspaceModeBanner,
} from '@/components/dashboard/dashboard-banners';
import { buildPreviewOverview } from '@/components/dashboard/dashboard-preview';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchStoredIssues,
  previewRepository,
  scrapeRepositoryWithOwnership,
  type IssueQuery,
  type IssuesResponse,
  type PreviewRepositoryResponse,
} from '@/lib/issues';
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
    () => ({ token, guestSessionId }),
    [guestSessionId, token]
  );
  const isPreviewMode = Boolean(previewData);
  const activeRepositoryScope = previewData?.repo ?? query.repo.trim();
  const trustTier = getUserTrustTier(user);
  const showVerificationWarning =
    status === 'authenticated' && trustTier === 'email_unverified';
  const isDashboardInitializing =
    !hasOwnershipContext || (!isPreviewMode && isLoading && !data);

  // Load stored issues
  useEffect(() => {
    if (!hasOwnershipContext || isPreviewMode) return;
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
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load stored issues.'
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadIssues();
    return () => controller.abort();
  }, [guestSessionId, hasOwnershipContext, isPreviewMode, query, refreshToken, token]);

  // Load recent repositories
  useEffect(() => {
    if (status !== 'authenticated' || !token) return;
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

  // External refresh event
  useEffect(() => {
    function refreshIssues() {
      setRefreshToken((current) => current + 1);
    }
    window.addEventListener('gitsense:refresh-issues', refreshIssues);
    return () => window.removeEventListener('gitsense:refresh-issues', refreshIssues);
  }, []);

  useEffect(() => {
    if (isDemoMode) seedDemoNotificationsOnce();
  }, [isDemoMode]);

  function applyFilters() {
    const nextQuery = { ...draftQuery, page: 1 };
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
    const previewQuery = { ...draftQuery, repo: normalizedRepository, page };
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
    const nextQuery = { ...query, repo: repository, page: 1 };
    setPreviewData(null);
    setData(null);
    setIsLoading(true);
    setQuery(nextQuery);
    setDraftQuery(nextQuery);
  }

  function handleClearRepositoryScope() {
    const nextQuery = { ...query, repo: '', page: 1 };
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
      const result = await scrapeRepositoryWithOwnership(normalizedRepository, {
        token,
        guestSessionId,
      });
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
      <div className="space-y-4 sm:space-y-6">
        <DashboardInitializationBanner />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <WorkspaceModeBanner
        isDemoMode={isDemoMode}
        status={status}
        user={user}
        guestSession={guestSession}
      />

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
        <div
          className="rounded-[10px] border px-4 py-3 text-[12.5px]"
          style={{
            background:
              'color-mix(in oklch, var(--gs-state-open) 10%, transparent)',
            borderColor:
              'color-mix(in oklch, var(--gs-state-open) 30%, transparent)',
            color: 'var(--gs-state-open)',
          }}
        >
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
          onPick={(repository) => {
            setDraftQuery((current) => ({ ...current, repo: repository }));
            void handlePreviewRepository(repository);
          }}
        />
      )}

      {status === 'authenticated' && !isAuthenticatedEmptyWorkspace && (
        <DeveloperActivityPanel token={token} refreshTrigger={refreshToken} />
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
