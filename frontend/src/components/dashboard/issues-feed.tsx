'use client';

import { CheckCircle2, Circle, Clock, ExternalLink, MessageCircle } from 'lucide-react';
import type { StoredIssue } from '@/lib/issues';
import { Badge, Button } from '@/components/primitives';
import { NoDataState } from './empty-state';
import { SkeletonIssueRow } from './loading-skeleton';

interface IssuesFeedProps {
  issues: StoredIssue[];
  isLoading: boolean;
  page: number;
  limit: number;
  totalIssues: number;
  onPageChange: (page: number) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function relativeAge(value: string): string {
  const ms = Date.now() - new Date(value).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

const LABEL_TONES: Array<'info' | 'warning' | 'merged' | 'open' | 'closed' | 'danger' | 'neutral'> = [
  'info',
  'warning',
  'merged',
  'open',
  'danger',
  'neutral',
];

function labelTone(i: number) {
  return LABEL_TONES[i % LABEL_TONES.length];
}

export function IssuesFeed({
  issues,
  isLoading,
  page,
  limit,
  totalIssues,
  onPageChange,
}: IssuesFeedProps) {
  const totalPages = Math.max(1, Math.ceil(totalIssues / limit));

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            Issue feed
          </p>
          <p
            className="mt-0.5 text-[12.5px]"
            style={{ color: 'var(--gs-fg-2)', opacity: 0.85 }}
          >
            Synced issues across your tracked repositories
          </p>
        </div>
        <p
          className="flex-shrink-0 font-mono text-[11px] tabular-nums"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          <span className="sm:hidden">{page}/{totalPages} · {totalIssues.toLocaleString()}</span>
          <span className="hidden sm:inline">Page {page} / {totalPages} · {totalIssues.toLocaleString()} total</span>
        </p>
      </div>

      <div
        className="overflow-hidden rounded-[12px] border [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
        style={{
          background: 'var(--gs-bg-1)',
          borderColor: 'var(--gs-border-default)',
        }}
      >
        {isLoading ? (
          <div className="divide-y" style={{ borderColor: 'var(--gs-border-subtle)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-2">
                <SkeletonIssueRow />
              </div>
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="p-4">
            <NoDataState />
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--gs-border-subtle)' }}>
            {issues.map((issue) => {
              const isOpen = issue.state === 'open';
              return (
                <li key={issue.id}>
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-3 px-3 py-3 transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] hover:bg-[color:var(--gs-bg-2)] sm:py-2.5"
                  >
                    {/* State glyph */}
                    <span
                      aria-hidden="true"
                      className="mt-[3px] inline-flex shrink-0 items-center justify-center"
                      style={{
                        color: isOpen
                          ? 'var(--gs-state-open)'
                          : 'var(--gs-state-closed)',
                      }}
                    >
                      {isOpen ? (
                        <Circle size={14} strokeWidth={2} />
                      ) : (
                        <CheckCircle2 size={14} strokeWidth={2} />
                      )}
                    </span>

                    {/* Title + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="line-clamp-2 text-[13px] font-medium transition-colors group-hover:text-[color:var(--gs-accent-primary)] sm:truncate sm:line-clamp-1"
                          style={{ color: 'var(--gs-fg-0)' }}
                        >
                          {issue.title}
                        </span>
                        <span
                          className="shrink-0 font-mono text-[11px] tabular-nums"
                          style={{ color: 'var(--gs-fg-2)' }}
                        >
                          #{issue.number}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:gap-x-3"
                        style={{ color: 'var(--gs-fg-2)' }}
                      >
                        <span className="font-mono truncate max-w-[40vw] sm:max-w-none">{issue.repo}</span>
                        <span aria-hidden="true" className="opacity-60">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {relativeAge(issue.updated_at)}
                        </span>
                        <span aria-hidden="true" className="hidden opacity-60 sm:inline">·</span>
                        <span className="hidden sm:inline">opened {formatDate(issue.created_at)}</span>
                        <span aria-hidden="true" className="opacity-60 sm:hidden">·</span>
                        <span className="inline-flex items-center gap-1 sm:hidden">
                          <MessageCircle size={11} />
                          {issue.comments}
                        </span>
                        {issue.labels.length > 0 ? (
                          <>
                            <span aria-hidden="true" className="opacity-60">·</span>
                            <span className="flex flex-wrap items-center gap-1">
                              {issue.labels.slice(0, 2).map((label, idx) => (
                                <Badge
                                  key={label}
                                  tone={labelTone(idx)}
                                  size="sm"
                                  className="font-normal"
                                >
                                  {label}
                                </Badge>
                              ))}
                              {/* Extra labels on sm+ only */}
                              {issue.labels.slice(2, 4).map((label, idx) => (
                                <Badge
                                  key={label}
                                  tone={labelTone(idx + 2)}
                                  size="sm"
                                  className="hidden font-normal sm:inline-flex"
                                >
                                  {label}
                                </Badge>
                              ))}
                              {issue.labels.length > 2 ? (
                                <span className="text-[11px] text-[color:var(--gs-fg-2)] sm:hidden">
                                  +{issue.labels.length - 2}
                                </span>
                              ) : null}
                              {issue.labels.length > 4 ? (
                                <span className="hidden text-[11px] text-[color:var(--gs-fg-2)] sm:inline">
                                  +{issue.labels.length - 4}
                                </span>
                              ) : null}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Right meta — comments + external icon on sm+, just icon on mobile */}
                    <div className="ml-2 flex shrink-0 items-center gap-3">
                      <span
                        className="hidden items-center gap-1 text-[11px] tabular-nums sm:inline-flex"
                        style={{ color: 'var(--gs-fg-2)' }}
                      >
                        <MessageCircle size={11} />
                        {issue.comments}
                      </span>
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors group-hover:bg-[color:var(--gs-bg-3)] sm:h-5 sm:w-5"
                        style={{ color: 'var(--gs-fg-2)' }}
                        aria-hidden="true"
                      >
                        <ExternalLink size={13} />
                      </span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px]" style={{ color: 'var(--gs-fg-2)' }}>
          Showing {issues.length} issues from page {page}
        </p>
        <div className="flex flex-shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
