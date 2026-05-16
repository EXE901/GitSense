'use client';

import { useState } from 'react';
import { Eye, Filter, RefreshCw, Search, X } from 'lucide-react';
import type { IssueQuery, IssueSortBy, IssueState, SortDirection } from '@/lib/issues';
import type { RepositoryHistoryItem } from '@/lib/repositories';

interface FilterBarProps {
  query: IssueQuery;
  hasPendingChanges: boolean;
  onChange: (updates: Partial<IssueQuery>) => void;
  onApply: () => void;
  onReset: () => void;
  onPreviewRepository: (repository: string) => Promise<boolean>;
  onScopeRepository: (repository: string) => void;
  onClearRepositoryScope: () => void;
  onRemoveRepository: (repository: RepositoryHistoryItem) => Promise<void>;
  onSyncRepository: (repository: string) => Promise<boolean>;
  isSyncing: boolean;
  isPreviewing: boolean;
  removingRepositoryId?: number | null;
  activeRepositoryScope?: string;
  recentRepositories?: RepositoryHistoryItem[];
}

const sortOptions: { label: string; value: IssueSortBy }[] = [
  { label: 'Recently updated', value: 'updated_at' },
  { label: 'Created date', value: 'created_at' },
  { label: 'Most comments', value: 'comments' },
  { label: 'Issue number', value: 'number' },
  { label: 'Title', value: 'title' },
  { label: 'State', value: 'state' },
  { label: 'Repository', value: 'repo' },
];

export function FilterBar({
  query,
  hasPendingChanges,
  onChange,
  onApply,
  onReset,
  onPreviewRepository,
  onScopeRepository,
  onClearRepositoryScope,
  onRemoveRepository,
  onSyncRepository,
  isSyncing,
  isPreviewing,
  removingRepositoryId = null,
  activeRepositoryScope = '',
  recentRepositories = [],
}: FilterBarProps) {
  const [syncRepository, setSyncRepository] = useState('');
  const activeFilters = [
    query.repo ? `Repository: ${query.repo}` : null,
    query.state ? `State: ${query.state}` : null,
    `Sort: ${query.sortBy.replace('_', ' ')}`,
    `Direction: ${query.sortDirection}`,
  ].filter((filter): filter is string => Boolean(filter));

  return (
    <section className="mb-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (hasPendingChanges) {
            onApply();
          }
        }}
        className="bg-card border border-border rounded-xl p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <label className="flex-1 min-w-[220px]">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Search size={14} />
              Repository
            </span>
            <input
              value={query.repo}
              onChange={(event) => onChange({ repo: event.target.value })}
              onKeyDown={async (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  await onPreviewRepository(query.repo);
                }
              }}
              placeholder="owner/repo"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-smooth"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</span>
            <select
              value={query.state}
              onChange={(event) => onChange({ state: event.target.value as IssueState })}
              className="w-full xl:w-36 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-smooth"
            >
              <option value="">All states</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort</span>
            <select
              value={query.sortBy}
              onChange={(event) => onChange({ sortBy: event.target.value as IssueSortBy })}
              className="w-full xl:w-48 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-smooth"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</span>
            <select
              value={query.sortDirection}
              onChange={(event) => onChange({ sortDirection: event.target.value as SortDirection })}
              className="w-full xl:w-36 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-smooth"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row xl:pb-0">
            <button
              type="button"
              onClick={() => onPreviewRepository(query.repo)}
              disabled={!query.repo.trim() || isPreviewing}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40 transition-smooth"
            >
              <Eye size={16} />
              {isPreviewing ? 'Previewing' : 'Preview'}
            </button>
            <button
              type="submit"
              disabled={!hasPendingChanges}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 transition-smooth"
            >
              <Filter size={16} />
              Apply
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-smooth"
            >
              <X size={16} />
              Reset
            </button>
          </div>
        </div>
      </form>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <span key={filter} className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              {filter}
            </span>
          ))}
          {hasPendingChanges && (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Pending changes
            </span>
          )}
        </div>

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const repositoryToSync = syncRepository.trim() || query.repo.trim();
            const didSync = await onSyncRepository(repositoryToSync);

            if (didSync) {
              setSyncRepository('');
            }
          }}
          className="flex min-w-0 gap-2"
        >
          <input
            name="repository"
            value={syncRepository}
            onChange={(event) => setSyncRepository(event.target.value)}
            placeholder="Sync owner/repo"
            className="min-w-0 flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-smooth"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            Sync
          </button>
        </form>
      </div>

      {recentRepositories.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scope
          </span>
          <button
            type="button"
            onClick={onClearRepositoryScope}
            className={`rounded-full border px-3 py-1 text-xs transition-smooth ${
              activeRepositoryScope
                ? 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-primary'
                : 'border-primary/40 bg-primary/10 text-primary'
            }`}
          >
            Workspace
          </button>
          {recentRepositories.slice(0, 5).map((repository) => (
            <span
              key={repository.id}
              className={`group inline-flex items-center overflow-hidden rounded-full border text-xs transition-smooth ${
                activeRepositoryScope === repository.full_name
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
              title={`${repository.issue_pages_synced} GitHub issue pages indexed`}
            >
              <button
                type="button"
                onClick={() => onScopeRepository(repository.full_name)}
                className="px-3 py-1"
              >
                {repository.full_name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${repository.full_name} from workspace`}
                disabled={removingRepositoryId === repository.id}
                onClick={() => void onRemoveRepository(repository)}
                className="mr-1 rounded-full p-0.5 opacity-50 transition-smooth hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-300 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
