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
import { Shimmer, useReducedMotion } from '@/components/motion';

interface ChartsSectionProps {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
  previewIssues?: StoredIssue[] | null;
  previewDistribution?: IssueDistribution | null;
}

// Chart palette (token-based, GitHub-blue + supporting hues).
const chartColors = {
  stroke: 'var(--gs-fg-2)',
  grid: 'var(--gs-border-subtle)',
  open: 'var(--gs-state-open)',
  closed: 'var(--gs-accent-primary)',
  label: 'var(--gs-accent-cyan)',
  repo: 'var(--gs-chart-5)',
} as const;

const tooltipStyle = {
  background: 'var(--gs-bg-2)',
  border: '1px solid var(--gs-border-default)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--gs-fg-0)',
  padding: '6px 10px',
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
    <div
      className="overflow-hidden rounded-[10px] border p-3 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)] sm:rounded-[12px] sm:p-4"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor: 'var(--gs-border-default)',
      }}
    >
      <div className="mb-2.5 sm:mb-3">
        <h3
          className="text-[13px] font-medium"
          style={{ color: 'var(--gs-fg-0)' }}
        >
          {title}
        </h3>
        <p
          className="mt-0.5 text-[11.5px]"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          {description}
        </p>
      </div>
      <div className="h-[180px] min-w-0 sm:h-[220px]">
        {isLoading ? (
          <Shimmer height="100%" className="rounded-[8px]" />
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
  const reduced = useReducedMotion();
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
    if (!request.isReady || request.isPreviewMode) return;
    const controller = new AbortController();

    async function loadAnalytics() {
      setTimelineLoading(true);
      setLabelLoading(true);
      setRepositoryLoading(true);
      setDistributionLoading(true);
      try {
        await Promise.all([
          fetchAnalyticsTimeline(
            { token: request.token, guestSessionId: request.guestSessionId },
            30,
            request.repo,
            controller.signal
          )
            .then((data) => setTimelineData(data))
            .catch(() => setTimelineData([]))
            .finally(() => setTimelineLoading(false)),

          fetchAnalyticsLabels(
            { token: request.token, guestSessionId: request.guestSessionId },
            6,
            request.repo,
            controller.signal
          )
            .then((data) => setLabelData(data))
            .catch(() => setLabelData([]))
            .finally(() => setLabelLoading(false)),

          fetchAnalyticsRepositories(
            { token: request.token, guestSessionId: request.guestSessionId },
            6,
            request.repo,
            controller.signal
          )
            .then((data) => setRepositoryData(data))
            .catch(() => setRepositoryData([]))
            .finally(() => setRepositoryLoading(false)),

          fetchAnalyticsIssueDistribution(
            { token: request.token, guestSessionId: request.guestSessionId },
            request.repo,
            controller.signal
          )
            .then((data) => setDistributionData(data))
            .catch(() => setDistributionData(null))
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
  const resolvedRepositoryData = previewIssues
    ? buildPreviewRepositories(previewIssues, repo)
    : repositoryData;
  const resolvedDistributionData = previewDistribution ?? distributionData;

  const formattedTimelineData = resolvedTimelineData.map((entry) => ({
    ...entry,
    date: entry.date
      ? dateFormatter.format(new Date(`${entry.date}T00:00:00Z`))
      : 'Unknown',
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

  // Disable Recharts mount animation when reduced-motion is set.
  const animate = !reduced;

  const emptyMessage = (label: string) => (
    <div
      className="flex h-full items-center justify-center text-[12px]"
      style={{ color: 'var(--gs-fg-2)' }}
    >
      {label}
    </div>
  );

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            Analytics &amp; trends
          </p>
          <p
            className="mt-0.5 text-[12.5px]"
            style={{ color: 'var(--gs-fg-2)', opacity: 0.85 }}
          >
            {repo ? `Scoped to ${repo}` : 'Across all indexed repositories'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 sm:gap-4">
        <ChartCard
          title="Activity timeline"
          description="Issues updated over the last 30 days"
          isLoading={!isReady || (!isPreviewMode && timelineLoading)}
        >
          {formattedTimelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimelineData}>
                <defs>
                  <linearGradient id="gs-chart-open" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.open} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={chartColors.open} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gs-chart-closed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.closed} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={chartColors.closed} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke={chartColors.grid} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  width={32}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'var(--gs-border-strong)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="open"
                  stroke={chartColors.open}
                  strokeWidth={1.75}
                  fill="url(#gs-chart-open)"
                  isAnimationActive={animate}
                />
                <Area
                  type="monotone"
                  dataKey="closed"
                  stroke={chartColors.closed}
                  strokeWidth={1.75}
                  fill="url(#gs-chart-closed)"
                  isAnimationActive={animate}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            emptyMessage('No activity data available')
          )}
        </ChartCard>

        <ChartCard
          title="Open vs closed"
          description="Overall operational status balance"
          isLoading={!isReady || (!isPreviewMode && distributionLoading)}
        >
          {issueRatioData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={issueRatioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={88}
                  dataKey="value"
                  paddingAngle={4}
                  isAnimationActive={animate}
                  stroke="var(--gs-bg-1)"
                  strokeWidth={2}
                >
                  {issueRatioData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            emptyMessage('No distribution data available')
          )}
        </ChartCard>

        <ChartCard
          title="Top labels"
          description="Most frequently used tags"
          isLoading={!isReady || (!isPreviewMode && labelLoading)}
        >
          {resolvedLabelData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolvedLabelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 4" stroke={chartColors.grid} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  width={92}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--gs-bg-2)' }} />
                <Bar
                  dataKey="count"
                  fill={chartColors.label}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            emptyMessage('No label data available')
          )}
        </ChartCard>

        <ChartCard
          title="Repository activity"
          description="Issue distribution across repositories"
          isLoading={!isReady || (!isPreviewMode && repositoryLoading)}
        >
          {formattedRepositoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedRepositoryData}>
                <CartesianGrid strokeDasharray="3 4" stroke={chartColors.grid} />
                <XAxis
                  dataKey="repo"
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={chartColors.stroke}
                  tick={{ fontSize: 11, fill: 'var(--gs-fg-2)' }}
                  width={32}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--gs-bg-2)' }} />
                <Bar
                  dataKey="issues"
                  fill={chartColors.repo}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={animate}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            emptyMessage('No repository data available')
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
    if (entry) entry[issue.state] += 1;
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
