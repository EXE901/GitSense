'use client';

import { useEffect, useMemo, useState } from 'react';
import { Grid3x3, LayoutGrid } from 'lucide-react';
import {
  fetchActivityHeatmap,
  type HeatmapCell,
  type HeatmapResponse,
} from '@/lib/operations';
import type { OwnershipHeaders } from '@/lib/issues';

type ActivityHeatmapProps = {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
};

type MetricKey = 'activity' | 'stale' | 'load';

const metricMeta: Record<
  MetricKey,
  {
    label: string;
    description: string;
    rangeLabel: (cell: HeatmapCell) => string;
    legendLow: string;
    legendHigh: string;
    swatch: (intensity: number) => string;
  }
> = {
  activity: {
    label: 'Recent activity (7d)',
    description: 'Issues updated in the past 7 days per repository.',
    rangeLabel: (cell) => `${cell.recent_activity} updates`,
    legendLow: 'Quiet',
    legendHigh: 'Busy',
    swatch: (intensity) =>
      `rgba(6, 182, 212, ${Math.max(intensity, 0.08).toFixed(2)})`,
  },
  stale: {
    label: 'Stale pressure',
    description: 'Open issues that have not been updated in 14+ days.',
    rangeLabel: (cell) => `${cell.stale_open} stale`,
    legendLow: 'Fresh',
    legendHigh: 'Backed up',
    swatch: (intensity) =>
      `rgba(239, 68, 68, ${Math.max(intensity, 0.08).toFixed(2)})`,
  },
  load: {
    label: 'Open load',
    description: 'Number of currently open issues per repository.',
    rangeLabel: (cell) => `${cell.open_issues} open`,
    legendLow: 'Light',
    legendHigh: 'Heavy',
    swatch: (intensity) =>
      `rgba(245, 158, 11, ${Math.max(intensity, 0.08).toFixed(2)})`,
  },
};

const metricOrder: MetricKey[] = ['activity', 'stale', 'load'];

export function ActivityHeatmap({
  ownership,
  refreshTrigger = 0,
  isReady = true,
  repo = '',
}: ActivityHeatmapProps) {
  const [response, setResponse] = useState<HeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>('activity');

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
        const data = await fetchActivityHeatmap(ownership, repo, controller.signal);
        setResponse(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load activity heatmap.');
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

  const cells = response?.cells ?? [];
  const meta = metricMeta[metric];

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <LayoutGrid size={14} />
            </span>
            <h2 className="text-[17px] font-semibold text-foreground sm:text-xl">
              Operational Heatmap
            </h2>
            <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Repository density
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted-foreground sm:text-sm">{meta.description}</p>
        </div>
        <MetricSelector active={metric} onChange={setMetric} />
      </div>

      {isLoading && <HeatmapSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && cells.length === 0 && <EmptyHeatmap />}

      {!isLoading && !error && cells.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {cells.map((cell) => (
              <HeatmapTile key={cell.repository} cell={cell} metric={metric} />
            ))}
          </ul>
          <Legend metric={metric} max={response?.max} />
        </div>
      )}
    </section>
  );
}

function HeatmapTile({ cell, metric }: { cell: HeatmapCell; metric: MetricKey }) {
  const intensity = cell.intensity[metric] ?? 0;
  const meta = metricMeta[metric];
  const background = meta.swatch(intensity);

  return (
    <li
      className="group relative flex h-20 flex-col justify-between overflow-hidden rounded-lg border border-border p-2.5 transition-smooth hover:-translate-y-0.5 sm:h-24"
      style={{ backgroundColor: background }}
      title={`${cell.repository} · ${meta.rangeLabel(cell)}`}
    >
      <span className="truncate text-[11px] font-semibold text-foreground sm:text-xs">
        {cell.repository}
      </span>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-foreground/70">
          {meta.label.split(' ')[0]}
        </span>
        <span className="tabular-nums text-base font-semibold text-foreground sm:text-lg">
          {valueFor(cell, metric)}
        </span>
      </div>
    </li>
  );
}

function MetricSelector({
  active,
  onChange,
}: {
  active: MetricKey;
  onChange: (key: MetricKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Heatmap metric"
      className="inline-flex w-fit overflow-hidden rounded-lg border border-border bg-background/40"
    >
      {metricOrder.map((key) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`inline-flex h-9 items-center px-3 text-[12.5px] font-semibold transition-smooth sm:h-8 sm:text-xs ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {metricMeta[key].label.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

function Legend({
  metric,
  max,
}: {
  metric: MetricKey;
  max?: HeatmapResponse['max'];
}) {
  const meta = metricMeta[metric];
  const maxValue = max
    ? metric === 'activity'
      ? max.recent_activity
      : metric === 'stale'
        ? max.stale_open
        : max.open_issues
    : 0;

  return (
    <div className="mt-3 flex flex-col items-start gap-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span>{meta.legendLow}</span>
        <span className="inline-flex h-2 w-32 overflow-hidden rounded-full border border-border">
          {Array.from({ length: 10 }).map((_, idx) => (
            <span
              key={idx}
              aria-hidden="true"
              className="block flex-1"
              style={{ backgroundColor: meta.swatch((idx + 1) / 10) }}
            />
          ))}
        </span>
        <span>{meta.legendHigh}</span>
      </div>
      <span className="inline-flex items-center gap-1.5">
        <Grid3x3 size={11} aria-hidden="true" />
        Max in workspace · <span className="tabular-nums text-foreground/80">{maxValue}</span>
      </span>
    </div>
  );
}

function EmptyHeatmap() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center sm:p-8">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <LayoutGrid size={18} />
      </div>
      <p className="text-sm font-semibold text-foreground">
        Heatmap density will appear here
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        Sync repositories with active issues to render comparable shading across
        activity, stale pressure, and open load.
      </p>
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-20 animate-pulse rounded-lg border border-border bg-secondary/40 sm:h-24"
          />
        ))}
      </div>
    </div>
  );
}

function valueFor(cell: HeatmapCell, metric: MetricKey): number {
  switch (metric) {
    case 'activity':
      return cell.recent_activity;
    case 'stale':
      return cell.stale_open;
    case 'load':
    default:
      return cell.open_issues;
  }
}
