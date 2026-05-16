'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  History,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  fetchInsightHistory,
  type InsightHistoryEvent,
  type InsightHistoryResponse,
} from '@/lib/operations';
import type { OwnershipHeaders } from '@/lib/issues';

type InsightTimelineProps = {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
};

const severityPalette = {
  high: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
  low: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
} as const;

const severityDot = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
  info: 'bg-cyan-500',
} as const;

const severityLabel = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
} as const;

export function InsightTimeline({
  ownership,
  refreshTrigger = 0,
  isReady = true,
}: InsightTimelineProps) {
  const [response, setResponse] = useState<InsightHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestKey = useMemo(
    () =>
      [
        isReady ? 'ready' : 'pending',
        ownership?.token ?? 'no-token',
        ownership?.guestSessionId ?? 'no-guest',
      ].join('|'),
    [isReady, ownership?.token, ownership?.guestSessionId],
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
        const data = await fetchInsightHistory(ownership, 25, controller.signal);
        setResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load insight history.');
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
    <section className="mb-6">
      <div className="mb-4 flex flex-col gap-1 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <History size={14} />
          </span>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Insight Timeline
          </h2>
          <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recurrence
          </span>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Persistent operational signals, first seen and most recently observed.
        </p>
      </div>

      {isLoading && <TimelineSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && response && response.events.length === 0 && (
        <EmptyTimeline />
      )}

      {!isLoading && !error && response && response.events.length > 0 && (
        <ol className="space-y-3">
          {response.events.map((event) => (
            <TimelineEntry key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineEntry({ event }: { event: InsightHistoryEvent }) {
  const sevPalette = severityPalette[event.severity] ?? severityPalette.info;
  const sevDot = severityDot[event.severity] ?? severityDot.info;
  const sevLabel = severityLabel[event.severity] ?? 'Info';
  const persistenceText = formatPersistence(event.first_seen_at, event.last_seen_at);
  const trendInfo = trendChip(event.severity_trend);

  return (
    <li className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevPalette}`}
            >
              <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${sevDot}`} />
              {sevLabel}
            </span>
            {trendInfo && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border bg-background/40 px-2 py-0.5 text-[10px] font-semibold ${trendInfo.tone}`}
              >
                <trendInfo.Icon size={11} aria-hidden="true" />
                {trendInfo.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              ×{event.occurrence_count}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{event.title}</p>
          {event.repository && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.repository}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:items-end">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={11} aria-hidden="true" />
            {persistenceText}
          </span>
          <span className="tabular-nums">
            First seen {formatRelative(event.first_seen_at)} · last {formatRelative(event.last_seen_at)}
          </span>
        </div>
      </div>
    </li>
  );
}

function EmptyTimeline() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center sm:p-8">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <History size={18} />
      </div>
      <p className="text-sm font-semibold text-foreground">
        Insight history will populate as signals recur
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        Each time the engine detects a signal it records the occurrence here, so you
        can see what is persisting, improving, or worsening across weeks.
      </p>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          className="h-16 animate-pulse rounded-xl border border-border bg-card"
        />
      ))}
    </div>
  );
}

function trendChip(trend: InsightHistoryEvent['severity_trend']) {
  if (trend === 'worsening') {
    return {
      Icon: TrendingUp,
      label: 'Worsening',
      tone: 'border-red-500/25 text-red-700 dark:text-red-300',
    };
  }
  if (trend === 'improving') {
    return {
      Icon: TrendingDown,
      label: 'Improving',
      tone: 'border-emerald-500/25 text-emerald-700 dark:text-emerald-300',
    };
  }
  return {
    Icon: Minus,
    label: 'Steady',
    tone: 'border-border text-muted-foreground',
  };
}

function formatPersistence(firstSeenAt: string, lastSeenAt: string): string {
  const first = Date.parse(firstSeenAt);
  const last = Date.parse(lastSeenAt);

  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) {
    return 'Recurring';
  }

  const diffMs = last - first;
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 2) {
    return 'Just started';
  }
  if (diffMinutes < 60) {
    return `Persisting ${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Persisting ${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `Persisting ${diffDays}d`;
  }
  const diffWeeks = Math.round(diffDays / 7);
  return `Persisting ${diffWeeks}w`;
}

function formatRelative(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return 'recently';
  }

  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(timestamp),
  );
}
