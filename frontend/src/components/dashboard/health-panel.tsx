'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CircleDot,
  HeartPulse,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  fetchWorkspaceHealth,
  type HealthSignalTone,
  type HealthState,
  type RepositoryHealth,
  type WorkspaceHealthResponse,
  type WorkspaceHealthSummary,
} from '@/lib/operations';
import type { OwnershipHeaders } from '@/lib/issues';

type HealthPanelProps = {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
};

const stateLabel: Record<HealthState, string> = {
  healthy: 'Healthy',
  stable: 'Stable',
  watch: 'Watch',
  at_risk: 'At Risk',
  no_data: 'No data yet',
};

const stateDescription: Record<HealthState, string> = {
  healthy: 'No elevated risks across the workspace.',
  stable: 'A few minor signals — nothing acute.',
  watch: 'Multiple signals trending in the wrong direction.',
  at_risk: 'Backlog, throughput, or maintenance pressure is high.',
  no_data: 'Sync a repository to begin computing workspace health.',
};

const statePalette: Record<
  HealthState,
  { tone: string; chip: string; ring: string; dot: string }
> = {
  healthy: {
    tone: 'text-emerald-700 dark:text-emerald-300',
    chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    ring: 'stroke-emerald-500',
    dot: 'bg-emerald-500',
  },
  stable: {
    tone: 'text-blue-700 dark:text-blue-300',
    chip: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    ring: 'stroke-blue-500',
    dot: 'bg-blue-500',
  },
  watch: {
    tone: 'text-amber-700 dark:text-amber-200',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    ring: 'stroke-amber-500',
    dot: 'bg-amber-500',
  },
  at_risk: {
    tone: 'text-red-700 dark:text-red-300',
    chip: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300',
    ring: 'stroke-red-500',
    dot: 'bg-red-500',
  },
  no_data: {
    tone: 'text-muted-foreground',
    chip: 'border-border bg-secondary/40 text-muted-foreground',
    ring: 'stroke-muted-foreground/40',
    dot: 'bg-muted-foreground/50',
  },
};

const toneIcon: Record<HealthSignalTone, React.ComponentType<{ size?: number }>> = {
  positive: ShieldCheck,
  watch: AlertTriangle,
  negative: ShieldAlert,
};

const toneClass: Record<HealthSignalTone, string> = {
  positive: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  watch: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  negative: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
};

export function HealthPanel({
  ownership,
  refreshTrigger = 0,
  isReady = true,
  repo = '',
}: HealthPanelProps) {
  const [response, setResponse] = useState<WorkspaceHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!isReady) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWorkspaceHealth(ownership, repo, controller.signal);
        setResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load workspace health.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, refreshTrigger]);

  if (!isReady) {
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <HeartPulse size={14} />
          </span>
          <h2 className="text-[17px] font-semibold text-foreground sm:text-xl">
            Workspace Health
          </h2>
          <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Operational
          </span>
        </div>
        <p className="text-[12px] leading-snug text-muted-foreground sm:text-sm">
          Weighted across stale pressure, throughput, maintenance, and backlog signals.
        </p>
      </div>

      {isLoading && <HealthSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && response && (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
          <WorkspaceCard summary={response.workspace} />
          <RepositoryHealthList repositories={response.repositories} />
        </div>
      )}
    </section>
  );
}

function WorkspaceCard({ summary }: { summary: WorkspaceHealthSummary }) {
  const palette = statePalette[summary.state];
  const stateLabelText = stateLabel[summary.state];
  const stateDescriptionText = stateDescription[summary.state];
  const stateCounts = summary.state_counts;
  const concentration = summary.contributor_imbalance;

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-5">
      <header className="flex items-start gap-3 sm:gap-4">
        <HealthRing score={summary.score} state={summary.state} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.chip}`}
            >
              <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${palette.dot}`} />
              {stateLabelText}
            </span>
            {summary.primary_concern_label && summary.state !== 'healthy' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Top concern · {summary.primary_concern_label}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[14px] font-semibold text-foreground sm:text-base">
            Workspace overview
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground sm:text-sm">
            {stateDescriptionText}
          </p>
        </div>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:mt-4 sm:grid-cols-4">
        <Metric label="Repositories" value={summary.repository_count.toString()} />
        <Metric label="Indexed issues" value={summary.indexed_issues.toLocaleString()} />
        <Metric label="Avg score" value={summary.average_score.toString()} />
        <Metric label="Worst score" value={summary.worst_score.toString()} />
      </dl>

      <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CircleDot size={11} aria-hidden="true" />
          State distribution
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {(['healthy', 'stable', 'watch', 'at_risk'] as const).map((state) => (
            <span
              key={state}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${statePalette[state].chip}`}
            >
              <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${statePalette[state].dot}`} />
              {stateLabel[state]} · {stateCounts[state] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {concentration.available && concentration.top_repository && (
        <div className="mt-4 rounded-lg border border-border bg-background/30 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Users size={11} aria-hidden="true" />
            Contributor load (repository proxy)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/90">
            <span className="font-semibold">{concentration.top_repository}</span> holds{' '}
            <span className="tabular-nums font-semibold">{Math.round(concentration.top_share * 100)}%</span>{' '}
            of indexed activity.
          </p>
          <ConcentrationBar breakdown={concentration.repository_breakdown.slice(0, 6)} />
        </div>
      )}
    </article>
  );
}

function HealthRing({ score, state }: { score: number; state: HealthState }) {
  const palette = statePalette[state];
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center sm:h-16 sm:w-16">
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="32"
          cy="32"
          r={radius}
          className="stroke-secondary/70"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          className={palette.ring}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="relative text-center">
        <span className={`block text-[15px] font-bold tabular-nums sm:text-base ${palette.tone}`}>
          {clamped}
        </span>
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Score
        </span>
      </div>
    </div>
  );
}

function ConcentrationBar({
  breakdown,
}: {
  breakdown: Array<{ repository: string; share: number; issue_count: number }>;
}) {
  if (breakdown.length === 0) {
    return null;
  }

  const palette = ['bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500'];

  return (
    <div className="mt-2">
      <span className="flex h-2 w-full overflow-hidden rounded-full border border-border bg-secondary/40">
        {breakdown.map((slice, index) => (
          <span
            key={slice.repository}
            aria-hidden="true"
            className={palette[index % palette.length]}
            style={{ width: `${Math.max(slice.share * 100, 1.5)}%` }}
            title={`${slice.repository} · ${Math.round(slice.share * 100)}%`}
          />
        ))}
      </span>
      <ul className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
        {breakdown.slice(0, 4).map((slice, index) => (
          <li key={slice.repository} className="flex items-center gap-1.5 truncate">
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${palette[index % palette.length]}`}
            />
            <span className="truncate">{slice.repository}</span>
            <span className="ml-auto tabular-nums text-foreground/80">
              {Math.round(slice.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RepositoryHealthList({ repositories }: { repositories: RepositoryHealth[] }) {
  if (!repositories || repositories.length === 0) {
    return (
      <article className="rounded-xl border border-border bg-card p-5 text-center sm:p-6 lg:col-span-7">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Activity size={18} />
        </div>
        <p className="text-sm font-semibold text-foreground">
          Per-repository health will appear here
        </p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground sm:text-xs">
          Sync a repository to see explainable per-repo scores, signals, and confidence.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-7">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          Per-repository health
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {repositories.length} repositor{repositories.length === 1 ? 'y' : 'ies'}
        </span>
      </header>
      <ul className="mt-3 divide-y divide-border/70">
        {repositories.map((repo) => (
          <li key={repo.repository} className="py-3 first:pt-0 last:pb-0">
            <RepositoryHealthRow repo={repo} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function RepositoryHealthRow({ repo }: { repo: RepositoryHealth }) {
  const palette = statePalette[repo.state];
  const topSignal = repo.rationale[0];
  const ToneIcon = topSignal ? toneIcon[topSignal.tone] : Check;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.chip}`}
          >
            <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${palette.dot}`} />
            {stateLabel[repo.state]}
          </span>
          <span className="truncate text-sm font-semibold text-foreground">
            {repo.repository}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {repo.open_issues} open · {repo.stale_open_issues} stale
          </span>
        </div>
        {topSignal && (
          <p
            className={`mt-1.5 inline-flex max-w-full items-start gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-snug ${toneClass[topSignal.tone]}`}
          >
            <ToneIcon size={11} aria-hidden="true" />
            <span className="truncate">{topSignal.message}</span>
          </p>
        )}
        {repo.rationale.length > 1 && topSignal && (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            +{repo.rationale.length - 1} more signal{repo.rationale.length - 1 === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
        <span className={`tabular-nums text-lg font-semibold ${palette.tone}`}>
          {repo.score}
        </span>
        <ConfidenceChip value={repo.confidence} />
      </div>
    </div>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
      Confidence {percent}%
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-2.5 py-2">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

function HealthSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
      <div className="h-56 animate-pulse rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-secondary/70" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-secondary/60" />
            <div className="h-4 w-1/2 rounded bg-secondary/70" />
            <div className="h-2 w-full rounded bg-secondary/50" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary/50" />
          ))}
        </div>
      </div>
      <div className="h-56 animate-pulse rounded-xl border border-border bg-card p-4 sm:p-5 lg:col-span-7">
        <div className="h-4 w-40 rounded bg-secondary/70" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary/50" />
          ))}
        </div>
      </div>
    </div>
  );
}
