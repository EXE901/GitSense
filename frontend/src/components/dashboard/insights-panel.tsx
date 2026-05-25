'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Hash,
  Layers,
  Lightbulb,
  MessageCircle,
  Minus,
  MoonStar,
  ShieldAlert,
  Sparkles,
  Tag,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  fetchWorkspaceInsights,
  type Insight,
  type InsightSeverity,
  type InsightTrend,
  type InsightType,
  type InsightsResponse,
} from '@/lib/insights';
import type { OwnershipHeaders } from '@/lib/issues';

type InsightsPanelProps = {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
};

export function InsightsPanel({
  ownership,
  refreshTrigger = 0,
  isReady = true,
  repo = '',
}: InsightsPanelProps) {
  const [response, setResponse] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef({
    token: ownership?.token ?? null,
    guestSessionId: ownership?.guestSessionId ?? null,
    repo,
    isReady,
  });

  useEffect(() => {
    requestRef.current = {
      token: ownership?.token ?? null,
      guestSessionId: ownership?.guestSessionId ?? null,
      repo,
      isReady,
    };
  });

  const requestKey = useMemo(
    () =>
      [
        isReady ? 'ready' : 'pending',
        ownership?.token ?? 'no-token',
        ownership?.guestSessionId ?? 'no-guest',
        repo || 'workspace',
      ].join('|'),
    [isReady, ownership?.token, ownership?.guestSessionId, repo],
  );

  useEffect(() => {
    if (!requestRef.current.isReady) {
      return;
    }

    const controller = new AbortController();

    async function loadInsights() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWorkspaceInsights(
          {
            token: requestRef.current.token,
            guestSessionId: requestRef.current.guestSessionId,
          },
          requestRef.current.repo,
          controller.signal,
        );

        setResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err.message : 'Unable to load insights.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadInsights();

    return () => controller.abort();
  }, [requestKey, refreshTrigger]);

  if (!isReady) {
    return null;
  }

  return (
    <section>
      <PanelHeader response={response} isLoading={isLoading} />

      {isLoading && <InsightsSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && response && response.insights.length === 0 && (
        <EmptyInsights />
      )}

      {!isLoading && !error && response && response.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {response.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}

function PanelHeader({
  response,
  isLoading,
}: {
  response: InsightsResponse | null;
  isLoading: boolean;
}) {
  const insightCount = response?.insights.length ?? 0;
  const repoCount = response?.workspace_repositories ?? 0;
  const issueCount = response?.indexed_issues ?? 0;

  return (
    <div className="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <Sparkles size={14} />
          </span>
          <h2 className="text-[17px] font-semibold text-foreground sm:text-xl">
            Workflow Insights
          </h2>
          <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            v1 · Rule-based
          </span>
        </div>
        <p className="mt-1 text-[12.5px] text-muted-foreground sm:text-sm">
          {isLoading
            ? 'Analyzing repository activity for operational signals.'
            : insightCount > 0
              ? `Surfaced ${insightCount} signal${insightCount === 1 ? '' : 's'} across ${repoCount} repositor${repoCount === 1 ? 'y' : 'ies'} and ${issueCount.toLocaleString()} indexed issue${issueCount === 1 ? '' : 's'}.`
              : 'No elevated risks detected across your workspace right now.'}
        </p>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const palette = severityPalette[insight.severity];
  const Icon = insightIcon[insight.type] ?? Lightbulb;
  const confidencePct = Math.round(insight.confidence * 100);

  return (
    <article
      className={`group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-smooth hover:-translate-y-0.5 hover:border-primary/30 sm:p-5 ${palette.containerBorder}`}
    >
      <header className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${palette.iconWrap}`}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={insight.severity} />
            <TrendChip trend={insight.trend} />
          </div>
          <h3 className="mt-2 line-clamp-2 text-[14.5px] font-semibold text-foreground sm:line-clamp-none sm:truncate sm:text-[15px]">
            {insight.title}
          </h3>
          {insight.repository && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {insight.repository}
            </p>
          )}
        </div>
      </header>

      <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
        {insight.description}
      </p>

      {insight.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-xs">
          {insight.metrics.slice(0, 2).map((metric) => (
            <div
              key={`${insight.id}-${metric.label}`}
              className="rounded-lg border border-border bg-background/40 px-2.5 py-2"
            >
              <dt className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {metric.label}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto rounded-lg border border-border bg-background/30 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Lightbulb size={11} aria-hidden="true" />
          Recommended action
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/90 sm:text-xs">
          {insight.recommendation}
        </p>
      </div>

      <footer className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
          />
          Confidence
        </span>
        <ConfidenceMeter value={confidencePct} tone={palette.meter} />
      </footer>
    </article>
  );
}

function SeverityBadge({ severity }: { severity: InsightSeverity }) {
  const palette = severityPalette[severity];
  const label = severityLabel[severity];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.badge}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-1.5 w-1.5 rounded-full ${palette.dot}`}
      />
      {label}
    </span>
  );
}

function TrendChip({ trend }: { trend: InsightTrend }) {
  if (trend === 'none') {
    return null;
  }

  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const label = trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Steady';
  const tone =
    trend === 'up'
      ? 'border-red-500/25 text-red-700 dark:text-red-300'
      : trend === 'down'
        ? 'border-amber-500/25 text-amber-700 dark:text-amber-200'
        : 'border-border text-muted-foreground';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-background/40 px-2 py-0.5 text-[10px] font-semibold ${tone}`}
      title={label}
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}

function ConfidenceMeter({ value, tone }: { value: number; tone: string }) {
  const clamped = Math.max(5, Math.min(100, value));

  return (
    <span className="inline-flex items-center gap-2" aria-label={`Confidence ${value}%`}>
      <span className="relative inline-block h-1.5 w-20 overflow-hidden rounded-full bg-secondary/60">
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 rounded-full ${tone}`}
          style={{ width: `${clamped}%` }}
        />
      </span>
      <span className="tabular-nums font-semibold text-foreground/80">{value}%</span>
    </span>
  );
}

function EmptyInsights() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-center sm:p-8">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <Sparkles size={18} />
      </div>
      <p className="text-sm font-semibold text-foreground">
        Insights will appear here as your workspace grows
      </p>
      <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground sm:text-xs">
        Sync at least one repository with enough issue history and the engine will surface
        stale backlog risk, intake spikes, bug trends, inactive repositories, and more.
      </p>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-52 animate-pulse rounded-xl border border-border bg-card p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary/70" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-secondary/60" />
              <div className="h-4 w-3/4 rounded bg-secondary/70" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-2 w-full rounded bg-secondary/50" />
            <div className="h-2 w-5/6 rounded bg-secondary/50" />
            <div className="h-2 w-3/4 rounded bg-secondary/40" />
          </div>
          <div className="mt-5 h-10 rounded-lg bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}

const severityLabel: Record<InsightSeverity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const severityPalette: Record<
  InsightSeverity,
  {
    containerBorder: string;
    iconWrap: string;
    badge: string;
    dot: string;
    meter: string;
  }
> = {
  high: {
    containerBorder: 'border-red-500/35',
    iconWrap:
      'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    badge:
      'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    meter: 'bg-red-500/80',
  },
  medium: {
    containerBorder: 'border-amber-500/30',
    iconWrap:
      'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    badge:
      'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    dot: 'bg-amber-500',
    meter: 'bg-amber-500/80',
  },
  low: {
    containerBorder: 'border-blue-500/30',
    iconWrap:
      'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    badge:
      'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    meter: 'bg-blue-500/80',
  },
  info: {
    containerBorder: 'border-cyan-500/30',
    iconWrap:
      'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    badge:
      'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
    dot: 'bg-cyan-500',
    meter: 'bg-cyan-500/80',
  },
};

const insightIcon: Record<InsightType, React.ComponentType<{ size?: number }>> = {
  stale_issue_growth: AlertTriangle,
  high_open_ratio: TrendingUp,
  bug_label_spike: Bug,
  unlabeled_backlog: Tag,
  inactive_repository: MoonStar,
  repository_concentration: Layers,
  issue_volume_spike: Zap,
  activity_drop: Activity,
  low_engagement_repository: MessageCircle,
  backlog_growth: Hash,
  discussion_hotspot: ShieldAlert,
  workspace_healthy: CheckCircle2,
};
