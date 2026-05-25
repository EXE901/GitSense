'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Clock,
  Cpu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  fetchWorkspaceBriefing,
  type BriefingTone,
  type WorkspaceBriefing,
} from '@/lib/ai-briefing';
import { formatModelLabel, formatModelTitle } from '@/lib/ai-model-labels';
import type { OwnershipHeaders } from '@/lib/issues';

type BriefingCardProps = {
  ownership?: OwnershipHeaders;
  refreshTrigger?: number;
  isReady?: boolean;
  repo?: string;
};

const tonePalette: Record<
  BriefingTone,
  { ring: string; chip: string; dot: string; accent: string }
> = {
  healthy: {
    ring: 'border-emerald-500/30',
    chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    accent: 'from-emerald-500/15 via-transparent to-transparent',
  },
  stable: {
    ring: 'border-blue-500/30',
    chip: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    accent: 'from-blue-500/15 via-transparent to-transparent',
  },
  watch: {
    ring: 'border-amber-500/30',
    chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
    dot: 'bg-amber-500',
    accent: 'from-amber-500/15 via-transparent to-transparent',
  },
  at_risk: {
    ring: 'border-red-500/35',
    chip: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    accent: 'from-red-500/15 via-transparent to-transparent',
  },
  no_data: {
    ring: 'border-border',
    chip: 'border-border bg-secondary/40 text-muted-foreground',
    dot: 'bg-muted-foreground/50',
    accent: 'from-primary/10 via-transparent to-transparent',
  },
};

const toneLabel: Record<BriefingTone, string> = {
  healthy: 'Healthy',
  stable: 'Stable',
  watch: 'Watch',
  at_risk: 'At Risk',
  no_data: 'No data yet',
};

const toneRationale: Record<BriefingTone, string> = {
  healthy:
    'No elevated operational pressure detected across backlog, throughput, or contributor distribution.',
  stable:
    'Minor signals present but no compounding pressure — workspace is operating within normal range.',
  watch:
    'One or more signals are trending in the wrong direction. Worth monitoring before they compound.',
  at_risk:
    'Multiple operational signals are reinforcing each other. This is the bucket that typically precedes velocity loss.',
  no_data:
    'GitSense needs at least one synced repository to generate a grounded operational briefing.',
};

export function BriefingCard({
  ownership,
  refreshTrigger = 0,
  isReady = true,
  repo = '',
}: BriefingCardProps) {
  const [briefing, setBriefing] = useState<WorkspaceBriefing | null>(null);
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
        const data = await fetchWorkspaceBriefing(ownership, repo, controller.signal);
        setBriefing(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load briefing.');
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
      {isLoading && <BriefingSkeleton />}

      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {!isLoading && !error && briefing && <BriefingBody briefing={briefing} />}
    </section>
  );
}

function BriefingBody({ briefing }: { briefing: WorkspaceBriefing }) {
  const palette = tonePalette[briefing.tone];
  const confidencePct = Math.round(briefing.confidence * 100);
  const generated = formatRelative(briefing.generated_at);
  const isLLM = briefing.source === 'llm';

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-card ${palette.ring}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${palette.accent}`}
      />
      <div className="relative p-3 sm:p-5">
        <header className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary sm:h-9 sm:w-9"
            >
              <Sparkles size={14} className="sm:hidden" />
              <Sparkles size={16} className="hidden sm:inline" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:tracking-[0.18em]">
                  Operational Briefing
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider sm:px-2 sm:text-[10px] ${palette.chip}`}
                >
                  <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                  {toneLabel[briefing.tone]}
                </span>
              </div>
              <h2 className="mt-1 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-foreground sm:mt-1.5 sm:text-lg">
                {briefing.headline}
              </h2>
            </div>
          </div>
          <SourceChip isLLM={isLLM} model={briefing.model} />
        </header>

        <p className="mt-2 line-clamp-4 text-[13.5px] leading-relaxed text-foreground/90 sm:mt-3 sm:line-clamp-none sm:text-[15px]">
          {briefing.summary}
        </p>

        <p className="mt-2 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
          <span className="font-semibold uppercase tracking-wider text-foreground/60">
            Why this matters ·{' '}
          </span>
          {toneRationale[briefing.tone]}
        </p>

        {briefing.notes.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-200 sm:mt-3 sm:px-3 sm:py-2">
            {briefing.notes.join(' ')}
          </div>
        )}

        {briefing.grounded_in.length > 0 && (
          <details className="group mt-4 rounded-lg border border-border bg-background/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-smooth hover:text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={11} aria-hidden="true" />
                Grounded in {briefing.grounded_in.length} signal
                {briefing.grounded_in.length === 1 ? '' : 's'}
              </span>
              <span
                aria-hidden="true"
                className="text-[10px] text-muted-foreground/70 group-open:hidden"
              >
                Show
              </span>
              <span
                aria-hidden="true"
                className="hidden text-[10px] text-muted-foreground/70 group-open:inline"
              >
                Hide
              </span>
            </summary>
            <ul className="border-t border-border/70 px-3 py-2 text-[11px]">
              {briefing.grounded_in.map((signal) => (
                <li
                  key={`${signal.label}-${signal.detail}`}
                  className="flex items-start justify-between gap-3 py-1"
                >
                  <span className="min-w-0 truncate font-medium text-foreground/90">
                    {signal.label}
                  </span>
                  <span className="flex-shrink-0 text-muted-foreground">
                    {signal.detail}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[11.5px] text-muted-foreground sm:mt-4 sm:pt-3 sm:text-[11px]">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={11} aria-hidden="true" />
            Updated {generated}
          </span>
          <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-1.5">
            Confidence {confidencePct}%
          </span>
          <span className="ml-auto hidden items-center gap-1.5 text-muted-foreground/70 sm:inline-flex">
            {isLLM ? 'AI interpretation grounded in deterministic signals' : 'Deterministic summary'}
          </span>
        </footer>
      </div>
    </article>
  );
}

function SourceChip({ isLLM, model }: { isLLM: boolean; model: string | null }) {
  if (isLLM) {
    const label = formatModelLabel(model);
    const title = formatModelTitle(model, 'llm');
    return (
      <span
        className="inline-flex max-w-[55%] flex-shrink-0 items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-200 sm:max-w-none"
        title={title}
      >
        <Bot size={11} aria-hidden="true" />
        <span className="truncate">AI · {label}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground"
      title={formatModelTitle(null, 'deterministic')}
    >
      <Cpu size={11} aria-hidden="true" />
      <span className="sm:hidden">Deterministic</span>
      <span className="hidden sm:inline">Deterministic summary</span>
    </span>
  );
}

function BriefingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex animate-pulse items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-secondary/70" />
        <div className="flex-1 space-y-2">
          <div className="h-2 w-32 rounded bg-secondary/60" />
          <div className="h-4 w-1/2 rounded bg-secondary/70" />
        </div>
      </div>
      <div className="mt-4 animate-pulse space-y-2">
        <div className="h-3 w-full rounded bg-secondary/40" />
        <div className="h-3 w-11/12 rounded bg-secondary/40" />
        <div className="h-3 w-9/12 rounded bg-secondary/40" />
      </div>
    </div>
  );
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
  return `${days}d ago`;
}
