'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Clock,
  Eye,
  GitBranch,
  GitFork,
  MessageSquare,
  Star,
  Tags,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { DashboardOverview } from '@/lib/analytics';
import { fetchAnalyticsOverview } from '@/lib/analytics';
import type { OwnershipHeaders } from '@/lib/issues';
import { Counter, RevealGroup } from '@/components/motion';

interface MetricsGridProps {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
  overviewOverride?: DashboardOverview | null;
}

interface MetricCardData {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle: string;
  sparklineData: number[];
}

function MetricCard({ title, value, icon, subtitle, sparklineData }: MetricCardData) {
  const max = Math.max(...sparklineData, 1);
  return (
    <div
      data-reveal="hidden"
      className="rounded-[10px] border p-3 sm:rounded-[12px] sm:p-3.5 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor: 'var(--gs-border-default)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            {title}
          </p>
          <p
            className="mt-0.5 hidden truncate text-[11px] sm:block"
            style={{ color: 'var(--gs-fg-2)', opacity: 0.8 }}
          >
            {subtitle}
          </p>
        </div>
        <div
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7"
          style={{
            background: 'var(--gs-accent-soft)',
            color: 'var(--gs-accent-primary)',
          }}
        >
          {icon}
        </div>
      </div>

      <div
        className="mt-2 text-[22px] font-medium tabular-nums tracking-[-0.01em] sm:mt-3 sm:text-[28px]"
        style={{ color: 'var(--gs-fg-0)', lineHeight: 1.1 }}
      >
        <Counter to={value} duration={1000} />
      </div>

      <svg width="100%" height="24" viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 opacity-90 sm:h-7">
        <defs>
          <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gs-accent-primary)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <polyline
          points={sparklineData
            .map(
              (v, i) =>
                `${(i / Math.max(sparklineData.length - 1, 1)) * 100},${
                  26 - (v / max) * 22
                }`
            )
            .join(' ')}
          fill="none"
          stroke={`url(#spark-${title})`}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function buildSparkline(values: number[]) {
  if (values.length >= 6) return values.slice(-8);
  return [1, 2, 1, 3, 2, Math.max(...values, 1)];
}

function buildMetricsFromOverview(o: DashboardOverview): MetricCardData[] {
  const i = 14;
  return [
    {
      title: 'Total Issues',
      value: o.total_issues,
      icon: <GitBranch size={i} />,
      subtitle: 'GitHub aggregate count',
      sparklineData: buildSparkline([o.total_issues, o.open_issues, o.closed_issues]),
    },
    {
      title: 'Indexed',
      value: o.indexed_issues,
      icon: <GitBranch size={i} />,
      subtitle: 'Stored locally',
      sparklineData: buildSparkline([o.indexed_issues, o.open_issues, o.closed_issues]),
    },
    {
      title: 'Open',
      value: o.open_issues,
      icon: <Activity size={i} />,
      subtitle: 'Actively tracked',
      sparklineData: buildSparkline([o.open_issues, o.closed_issues, o.total_issues]),
    },
    {
      title: 'Closed',
      value: o.closed_issues,
      icon: <Zap size={i} />,
      subtitle: 'Completed',
      sparklineData: buildSparkline([
        o.closed_issues,
        o.open_issues,
        Math.max(o.total_issues / 2, 1),
      ]),
    },
    {
      title: 'Avg Comments',
      value: Math.round(o.avg_comments_per_issue),
      icon: <MessageSquare size={i} />,
      subtitle: 'Per issue',
      sparklineData: buildSparkline([
        Math.round(o.avg_comments_per_issue),
        o.open_issues > 0 ? Math.round(o.open_issues / 10) : 1,
        o.closed_issues > 0 ? Math.round(o.closed_issues / 10) : 1,
      ]),
    },
    {
      title: 'Repositories',
      value: o.repositories_tracked,
      icon: <Clock size={i} />,
      subtitle: 'Being monitored',
      sparklineData: buildSparkline([
        o.repositories_tracked,
        o.open_issues > 0 ? Math.round(o.open_issues / 5) : 1,
        o.closed_issues > 0 ? Math.round(o.closed_issues / 5) : 1,
      ]),
    },
    {
      title: 'Stars',
      value: o.stars_count,
      icon: <Star size={i} />,
      subtitle: 'Repo stars',
      sparklineData: buildSparkline([o.stars_count, o.forks_count, o.watchers_count]),
    },
    {
      title: 'Forks',
      value: o.forks_count,
      icon: <GitFork size={i} />,
      subtitle: 'Repo forks',
      sparklineData: buildSparkline([o.forks_count, o.stars_count, o.watchers_count]),
    },
    {
      title: 'Watchers',
      value: o.watchers_count,
      icon: <Eye size={i} />,
      subtitle: 'Repo watchers',
      sparklineData: buildSparkline([o.watchers_count, o.stars_count, o.forks_count]),
    },
    {
      title: 'Labels',
      value: o.unique_labels,
      icon: <Tags size={i} />,
      subtitle: 'Unique tags',
      sparklineData: buildSparkline([
        o.unique_labels,
        o.open_issues,
        Math.max(Math.round(o.repositories_tracked * 2), 1),
      ]),
    },
    {
      title: 'Stale Issues',
      value: o.stale_issues_count,
      icon: <Clock size={i} />,
      subtitle: '14+ days idle',
      sparklineData: buildSparkline([
        o.stale_issues_count,
        o.open_issues > 0 ? Math.round(o.open_issues * 0.2) : 1,
        o.open_issues > 0 ? Math.round(o.open_issues * 0.1) : 1,
      ]),
    },
    {
      title: 'O/C Ratio',
      value: Math.round(o.open_closed_ratio * 100) / 100,
      icon: <TrendingUp size={i} />,
      subtitle: 'Open ÷ closed',
      sparklineData: buildSparkline([
        Math.round(o.open_closed_ratio * 10),
        Math.round((o.open_closed_ratio / 2) * 10),
        Math.round(o.open_closed_ratio * 1.5 * 10),
      ]),
    },
  ];
}

function MetricsHeader({ subtitle = 'Live metrics across your synced repositories' }: { subtitle?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          Analytics overview
        </p>
        <p
          className="mt-0.5 text-[12.5px]"
          style={{ color: 'var(--gs-fg-2)', opacity: 0.85 }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <section>
      <MetricsHeader subtitle="Preparing workspace metrics" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-[104px] rounded-[10px] border p-3 animate-pulse sm:h-[120px] sm:rounded-[12px] sm:p-3.5"
            style={{
              background: 'var(--gs-bg-1)',
              borderColor: 'var(--gs-border-default)',
            }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 rounded" style={{ background: 'var(--gs-bg-2)' }} />
                <div className="h-2 w-28 rounded" style={{ background: 'var(--gs-bg-2)' }} />
              </div>
              <div className="h-7 w-7 rounded-md" style={{ background: 'var(--gs-bg-2)' }} />
            </div>
            <div className="mb-3 h-7 w-16 rounded" style={{ background: 'var(--gs-bg-2)' }} />
            <div className="h-6 rounded" style={{ background: 'var(--gs-bg-2)' }} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MetricsGrid({
  ownership,
  refreshTrigger,
  isReady = true,
  repo = '',
  overviewOverride = null,
}: MetricsGridProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = ownership?.token ?? null;
  const guestSessionId = ownership?.guestSessionId ?? null;
  const metricModeKey = overviewOverride ? 'preview' : 'live';
  const metricRequestKey = [
    isReady ? 'ready' : 'pending',
    token ?? 'no-token',
    guestSessionId ?? 'no-guest-session',
    repo || 'workspace',
  ].join('|');
  const requestRef = useRef({
    token,
    guestSessionId,
    isReady,
    repo,
    hasOverviewOverride: Boolean(overviewOverride),
  });

  useEffect(() => {
    requestRef.current = {
      token,
      guestSessionId,
      isReady,
      repo,
      hasOverviewOverride: Boolean(overviewOverride),
    };
  });

  useEffect(() => {
    const request = requestRef.current;
    if (!request.isReady || request.hasOverviewOverride) return;
    const controller = new AbortController();

    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchAnalyticsOverview(
          { token: request.token, guestSessionId: request.guestSessionId },
          request.repo,
          controller.signal
        );
        setOverview(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load analytics');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
    return () => controller.abort();
  }, [metricModeKey, metricRequestKey, refreshTrigger]);

  if (!isReady || (!overviewOverride && isLoading)) {
    return <MetricsSkeleton />;
  }

  const resolvedOverview = overviewOverride ?? overview;

  if (error || !resolvedOverview) {
    return (
      <section>
        <MetricsHeader />
        <div
          className="rounded-[10px] border px-4 py-3 text-[12.5px]"
          style={{
            background: 'color-mix(in oklch, var(--gs-state-danger) 10%, transparent)',
            borderColor: 'color-mix(in oklch, var(--gs-state-danger) 30%, transparent)',
            color: 'var(--gs-state-danger)',
          }}
        >
          {error || 'Unable to load analytics. No repositories have been synced yet.'}
        </div>
      </section>
    );
  }

  const metrics = buildMetricsFromOverview(resolvedOverview);

  return (
    <section>
      <MetricsHeader />
      <RevealGroup
        stagger={60}
        y={12}
        duration={320}
        className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4"
      >
        {metrics.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </RevealGroup>
    </section>
  );
}
