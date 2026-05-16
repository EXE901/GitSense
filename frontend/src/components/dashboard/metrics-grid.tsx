'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Clock, Eye, GitBranch, GitFork, MessageSquare, Star, Tags, TrendingUp, Zap } from 'lucide-react';
import type { DashboardOverview } from '@/lib/analytics';
import { fetchAnalyticsOverview } from '@/lib/analytics';
import type { OwnershipHeaders } from '@/lib/issues';
import { AnimatedCounter, StaggerContainer } from './stagger-animation';

interface MetricsGridProps {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
  overviewOverride?: DashboardOverview | null;
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  subtitle: string;
  sparklineData: number[];
}

function MetricCard({ title, value, icon, subtitle, sparklineData }: MetricCardProps) {
  const maxSparklineValue = Math.max(...sparklineData, 1);

  return (
    <div className="group relative overflow-hidden animate-fade-in-up">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 smooth-transition" />
      <div className="relative bg-card border border-border rounded-xl p-4 sm:p-5 smooth-transition hover-lift">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
            <span className="block truncate text-xs text-muted-foreground/70 mt-0.5">{subtitle}</span>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 smooth-transition flex-shrink-0">
            {icon}
          </div>
        </div>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-foreground animate-counter">
            <AnimatedCounter value={value} />
          </span>
        </div>

        <svg width="100%" height="34" viewBox="0 0 100 34" className="opacity-70">
          <polyline
            points={sparklineData
              .map((val, idx) => `${(idx / Math.max(sparklineData.length - 1, 1)) * 100},${32 - (val / maxSparklineValue) * 24}`)
              .join(' ')}
            fill="none"
            stroke="url(#metricSparkline)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="metricSparkline" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function buildSparkline(values: number[]) {
  if (values.length >= 6) {
    return values.slice(-8);
  }

  return [1, 2, 1, 3, 2, Math.max(...values, 1)];
}

function buildMetricsFromOverview(overview: DashboardOverview): MetricCardProps[] {
  return [
    {
      title: 'Total Issues',
      value: overview.total_issues,
      icon: <GitBranch size={20} />,
      subtitle: 'GitHub aggregate count',
      sparklineData: buildSparkline([
        overview.total_issues,
        overview.open_issues,
        overview.closed_issues,
      ]),
    },
    {
      title: 'Indexed Issues',
      value: overview.indexed_issues,
      icon: <GitBranch size={20} />,
      subtitle: 'Stored locally for filtering',
      sparklineData: buildSparkline([
        overview.indexed_issues,
        overview.open_issues,
        overview.closed_issues,
      ]),
    },
    {
      title: 'Open Issues',
      value: overview.open_issues,
      icon: <Activity size={20} />,
      subtitle: 'Actively tracked',
      sparklineData: buildSparkline([
        overview.open_issues,
        overview.closed_issues,
        overview.total_issues,
      ]),
    },
    {
      title: 'Closed Issues',
      value: overview.closed_issues,
      icon: <Zap size={20} />,
      subtitle: 'Completed and resolved',
      sparklineData: buildSparkline([
        overview.closed_issues,
        overview.open_issues,
        Math.max(overview.total_issues / 2, 1),
      ]),
    },
    {
      title: 'Avg Comments',
      value: Math.round(overview.avg_comments_per_issue),
      icon: <MessageSquare size={20} />,
      subtitle: 'Discussion per issue',
      sparklineData: buildSparkline([
        Math.round(overview.avg_comments_per_issue),
        overview.open_issues > 0 ? Math.round(overview.open_issues / 10) : 1,
        overview.closed_issues > 0 ? Math.round(overview.closed_issues / 10) : 1,
      ]),
    },
    {
      title: 'Repositories',
      value: overview.repositories_tracked,
      icon: <Clock size={20} />,
      subtitle: 'Being monitored',
      sparklineData: buildSparkline([
        overview.repositories_tracked,
        overview.open_issues > 0 ? Math.round(overview.open_issues / 5) : 1,
        overview.closed_issues > 0 ? Math.round(overview.closed_issues / 5) : 1,
      ]),
    },
    {
      title: 'Stars',
      value: overview.stars_count,
      icon: <Star size={20} />,
      subtitle: 'GitHub repository stars',
      sparklineData: buildSparkline([
        overview.stars_count,
        overview.forks_count,
        overview.watchers_count,
      ]),
    },
    {
      title: 'Forks',
      value: overview.forks_count,
      icon: <GitFork size={20} />,
      subtitle: 'GitHub repository forks',
      sparklineData: buildSparkline([
        overview.forks_count,
        overview.stars_count,
        overview.watchers_count,
      ]),
    },
    {
      title: 'Watchers',
      value: overview.watchers_count,
      icon: <Eye size={20} />,
      subtitle: 'GitHub repository watchers',
      sparklineData: buildSparkline([
        overview.watchers_count,
        overview.stars_count,
        overview.forks_count,
      ]),
    },
    {
      title: 'Labels',
      value: overview.unique_labels,
      icon: <Tags size={20} />,
      subtitle: 'Unique tags across issues',
      sparklineData: buildSparkline([
        overview.unique_labels,
        overview.open_issues,
        Math.max(Math.round(overview.repositories_tracked * 2), 1),
      ]),
    },
    {
      title: 'Stale Issues',
      value: overview.stale_issues_count,
      icon: <Clock size={20} />,
      subtitle: '14+ days without updates',
      sparklineData: buildSparkline([
        overview.stale_issues_count,
        overview.open_issues > 0 ? Math.round(overview.open_issues * 0.2) : 1,
        overview.open_issues > 0 ? Math.round(overview.open_issues * 0.1) : 1,
      ]),
    },
    {
      title: 'O/C Ratio',
      value: Math.round(overview.open_closed_ratio * 100) / 100,
      icon: <TrendingUp size={20} />,
      subtitle: 'Open to closed ratio',
      sparklineData: buildSparkline([
        Math.round(overview.open_closed_ratio * 10),
        Math.round((overview.open_closed_ratio / 2) * 10),
        Math.round((overview.open_closed_ratio * 1.5) * 10),
      ]),
    },
  ];
}

function MetricsSkeleton() {
  return (
    <section className="mb-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Analytics Overview</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Preparing workspace metrics</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-32 bg-card border border-border rounded-xl p-4 animate-pulse">
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-secondary/70" />
                <div className="h-2 w-32 rounded bg-secondary/50" />
              </div>
              <div className="h-9 w-9 rounded-lg bg-secondary/70" />
            </div>
            <div className="mb-4 h-8 w-20 rounded bg-secondary/70" />
            <div className="h-8 rounded bg-secondary/50" />
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

    if (!request.isReady || request.hasOverviewOverride) {
      return;
    }

    const controller = new AbortController();

    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchAnalyticsOverview(
          {
            token: request.token,
            guestSessionId: request.guestSessionId,
          },
          request.repo,
          controller.signal
        );
        setOverview(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

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
      <section className="mb-6">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">Analytics Overview</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live metrics across your synced repositories</p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error || 'Unable to load analytics. No repositories have been synced yet.'}
        </div>
      </section>
    );
  }

  const metrics = buildMetricsFromOverview(resolvedOverview);

  return (
    <section className="mb-6">
      <div className="mb-4 sm:mb-5">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">Analytics Overview</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live metrics across your synced repositories</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StaggerContainer staggerDelay={70}>
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
