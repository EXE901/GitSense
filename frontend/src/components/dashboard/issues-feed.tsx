'use client';

import { AlertCircle, CheckCircle2, Clock, ExternalLink, MessageCircle } from 'lucide-react';
import type { StoredIssue } from '@/lib/issues';
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
    year: 'numeric',
  }).format(new Date(value));
}

function getLabelClass(index: number) {
  const classes = [
    'bg-red-500/15 text-red-400 border-red-500/30',
    'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'bg-green-500/15 text-green-400 border-green-500/30',
  ];

  return classes[index % classes.length];
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
    <section className="mb-8">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Issue Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">Synced issues across your tracked repositories</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Page {page} of {totalPages} / {totalIssues.toLocaleString()} total
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonIssueRow key={index} />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <NoDataState />
      ) : (
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <a
              key={issue.id}
              href={issue.url}
              target="_blank"
              rel="noreferrer"
              className={`block group bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 smooth-transition animate-fade-in-up ${
                index % 4 === 0 ? 'animate-stagger-1' : index % 4 === 1 ? 'animate-stagger-2' : index % 4 === 2 ? 'animate-stagger-3' : 'animate-stagger-4'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${
                        issue.state === 'open'
                          ? 'bg-green-500/15 text-green-400 border-green-500/40'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {issue.state === 'open' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                      <span className="capitalize">{issue.state}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground/70">#{issue.number}</span>
                    <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs rounded border border-border flex-shrink-0">
                      {issue.repo}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary smooth-transition">
                    {issue.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
                    {issue.labels.length > 0 ? (
                      issue.labels.slice(0, 6).map((label, labelIndex) => (
                        <span
                          key={label}
                          className={`px-2 py-0.5 rounded text-xs font-medium border ${getLabelClass(labelIndex)}`}
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/60">No labels</span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground/60">
                    <span className="whitespace-nowrap">Created {formatDate(issue.created_at)}</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock size={12} />
                      Updated {formatDate(issue.updated_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary rounded-lg text-muted-foreground text-xs font-medium">
                    <MessageCircle size={14} />
                    {issue.comments}
                  </div>
                  <div className="p-2 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary rounded-lg smooth-transition">
                    <ExternalLink size={16} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {issues.length} issues from page {page}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
            className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed smooth-transition"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
