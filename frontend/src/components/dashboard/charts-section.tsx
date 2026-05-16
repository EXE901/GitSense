'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchAnalyticsIssueDistribution,
  fetchAnalyticsLabels,
  fetchAnalyticsRepositories,
  fetchAnalyticsTimeline,
  type IssueDistribution,
  type LabelEntry,
  type RepositoryMetric,
  type TimelineEntry,
} from '@/lib/analytics';
import type { OwnershipHeaders, StoredIssue } from '@/lib/issues';

interface ChartsSectionProps {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
  previewIssues?: StoredIssue[] | null;
  previewDistribution?: IssueDistribution | null;
}

const chartColors = {
  stroke: '#94a3b8',
  grid: '#1f2937',
  open: '#3b82f6',
  closed: '#10b981',
  label: '#06b6d4',
  repo: '#a855f7',
};

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});

function ChartCard({
  title,
  description,
  children,
  isLoading = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 sm:p-5 overflow-hidden">
      <div className="mb-4 px-1 sm:px-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className={`h-[240px] min-w-0 ${isLoading ? 'flex items-center justify-center' : ''}`}>
        {isLoading ? (
          <div className="h-full w-full animate-pulse rounded-lg bg-secondary/40" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function ChartsSection({
  ownership,
  refreshTrigger,
  isReady = true,
  repo = '',
  previewIssues = null,
  previewDistribution = null,
}: ChartsSectionProps) {
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [labelData, setLabelData] = useState<LabelEntry[]>([]);
  const [repositoryData, setRepositoryData] = useState<RepositoryMetric[]>([]);
  const [distributionData, setDistributionData] = useState<IssueDistribution | null>(null);

  const [timelineLoading, setTimelineLoading] = useState(true);
  const [labelLoading, setLabelLoading] = useState(true);
  const [repositoryLoading, setRepositoryLoading] = useState(true);
  const [distributionLoading, setDistributionLoading] = useState(true);

  const token = ownership?.token ?? null;
  const guestSessionId = ownership?.guestSessionId ?? null;
  const isPreviewMode = Boolean(previewIssues);
  const chartModeKey = isPreviewMode ? 'preview' : 'live';
  const chartRequestKey = [
    isReady ? 'ready' : 'pending',
    token ?? 'no-token',
    guestSessionId ?? 'no-guest-session',
    repo || 'workspace',
  ].join('|');
  const requestRef = useRef({
    token,
    guestSessionId,
    isReady,
    isPreviewMode,
    repo,
  });

  useEffect(() => {
    requestRef.current = {
      token,
      guestSessionId,
      isReady,
      isPreviewMode,
      repo,
    };
  });

  useEffect(() => {
    const request = requestRef.current;

    if (!request.isReady || request.isPreviewMode) {
      return;
    }

    const controller = new AbortController();

    async function loadAnalytics() {
      setTimelineLoading(true);
      setLabelLoading(true);
      setRepositoryLoading(true);
      setDistributionLoading(true);

      try {
        await Promise.all([
          fetchAnalyticsTimeline(
            {
              token: request.token,
              guestSessionId: request.guestSessionId,
            },
            30,
            request.repo,
            controller.signal
          )
            .then((data) => {
              setTimelineData(data);
            })
            .catch(() => {
              setTimelineData([]);
            })
            .finally(() => setTimelineLoading(false)),

          fetchAnalyticsLabels(
            {
              token: request.token,
              guestSessionId: request.guestSessionId,
            },
            6,
            request.repo,
            controller.signal
          )
            .then((data) => {
              setLabelData(data);
            })
            .catch(() => {
              setLabelData([]);
            })
            .finally(() => setLabelLoading(false)),

          fetchAnalyticsRepositories(
            {
              token: request.token,
              guestSessionId: request.guestSessionId,
            },
            6,
            request.repo,
            controller.signal
          )
            .then((data) => {
              setRepositoryData(data);
            })
            .catch(() => {
              setRepositoryData([]);
            })
            .finally(() => setRepositoryLoading(false)),

          fetchAnalyticsIssueDistribution(
            {
              token: request.token,
              guestSessionId: request.guestSessionId,
            },
            request.repo,
            controller.signal
          )
            .then((data) => {
              setDistributionData(data);
            })
            .catch(() => {
              setDistributionData(null);
            })
            .finally(() => setDistributionLoading(false)),
        ]);
      } catch (error) {
        console.error('Failed to load charts analytics', error);
      }
    }

    loadAnalytics();

    return () => controller.abort();
  }, [chartModeKey, chartRequestKey, refreshTrigger]);

  const resolvedTimelineData = previewIssues ? buildPreviewTimeline(previewIssues) : timelineData;
  const resolvedLabelData = previewIssues ? buildPreviewLabels(previewIssues) : labelData;
  const resolvedRepositoryData = previewIssues ? buildPreviewRepositories(previewIssues, repo) : repositoryData;
  const resolvedDistributionData = previewDistribution ?? distributionData;

  const formattedTimelineData = resolvedTimelineData.map((entry) => ({
    ...entry,
    date: entry.date ? dateFormatter.format(new Date(`${entry.date}T00:00:00Z`)) : 'Unknown',
  }));

  const formattedRepositoryData = resolvedRepositoryData.map((repository) => ({
    repo: repository.repository.split('/').pop() || repository.repository,
    issues: repository.total_issues,
  }));

  const issueRatioData = resolvedDistributionData
    ? [
        { name: 'Open', value: resolvedDistributionData.open, fill: chartColors.open },
        { name: 'Closed', value: resolvedDistributionData.closed, fill: chartColors.closed },
      ]
    : [];

  return (
    <section className="mb-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-xl font-semibold text-foreground">Analytics & Trends</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {repo ? `Real data scoped to ${repo}` : 'Real data from all indexed repositories'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <ChartCard
          title="Activity Timeline"
          description="Issues updated over the last 30 days"
          isLoading={!isReady || (!isPreviewMode && timelineLoading)}
        >
          {formattedTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimelineData}>
                <defs>
                  <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.open} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={chartColors.open} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.closed} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={chartColors.closed} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="date" stroke={chartColors.stroke} tick={{ fontSize: 11 }} />
                <YAxis stroke={chartColors.stroke} tick={{ fontSize: 11 }} width={34} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="open" stroke={chartColors.open} fill="url(#colorIssues)" />
                <Area type="monotone" dataKey="closed" stroke={chartColors.closed} fill="url(#colorClosed)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No activity data available
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Open vs Closed"
          description="Overall operational status balance"
          isLoading={!isReady || (!isPreviewMode && distributionLoading)}
        >
          {issueRatioData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={issueRatioData} cx="50%" cy="50%" innerRadius={58} outerRadius={92} dataKey="value" paddingAngle={4}>
                  {issueRatioData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No distribution data available
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Top Labels"
          description="Most frequently used tags"
          isLoading={!isReady || (!isPreviewMode && labelLoading)}
        >
          {resolvedLabelData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolvedLabelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis type="number" stroke={chartColors.stroke} tick={{ fontSize: 11 }} />
                <YAxis dataKey="label" type="category" stroke={chartColors.stroke} tick={{ fontSize: 11 }} width={92} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill={chartColors.label} radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No label data available
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Repository Activity"
          description="Issue distribution across repositories"
          isLoading={!isReady || (!isPreviewMode && repositoryLoading)}
        >
          {formattedRepositoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedRepositoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="repo" stroke={chartColors.stroke} tick={{ fontSize: 11 }} />
                <YAxis stroke={chartColors.stroke} tick={{ fontSize: 11 }} width={34} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="issues" fill={chartColors.repo} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No repository data available
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function buildPreviewTimeline(issues: StoredIssue[]): TimelineEntry[] {
  const entries = new Map<string, TimelineEntry>();
  const today = new Date();

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - index);
    const key = date.toISOString().slice(0, 10);
    entries.set(key, { date: key, open: 0, closed: 0 });
  }

  issues.forEach((issue) => {
    const key = issue.updated_at?.slice(0, 10);
    const entry = key ? entries.get(key) : null;

    if (entry) {
      entry[issue.state] += 1;
    }
  });

  return Array.from(entries.values()).filter((entry) => entry.open > 0 || entry.closed > 0);
}

function buildPreviewLabels(issues: StoredIssue[]): LabelEntry[] {
  const counts = new Map<string, number>();

  issues.forEach((issue) => {
    issue.labels.forEach((label) => {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function buildPreviewRepositories(issues: StoredIssue[], repo: string): RepositoryMetric[] {
  const totalIssues = issues.length;
  const openIssues = issues.filter((issue) => issue.state === 'open').length;
  const closedIssues = issues.filter((issue) => issue.state === 'closed').length;
  const totalComments = issues.reduce((sum, issue) => sum + issue.comments, 0);
  const lastActivity =
    issues
      .map((issue) => issue.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

  return [
    {
      repository: repo || issues[0]?.repo || 'Preview repository',
      total_issues: totalIssues,
      open_issues: openIssues,
      closed_issues: closedIssues,
      indexed_issues: totalIssues,
      stars_count: 0,
      forks_count: 0,
      watchers_count: 0,
      issue_pages_synced: 0,
      issue_pages_exhausted: false,
      avg_comments: totalIssues > 0 ? totalComments / totalIssues : 0,
      last_activity: lastActivity,
    },
  ];
}
