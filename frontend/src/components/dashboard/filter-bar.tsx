'use client';

import { useState } from 'react';
import { ChevronDown, Eye, Filter, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import type { IssueQuery, IssueSortBy, IssueState, SortDirection } from '@/lib/issues';
import type { RepositoryHistoryItem } from '@/lib/repositories';
import { Button, Tag } from '@/components/primitives';
import { RepositorySearchInput } from '@/components/dashboard/repository-search-input';
import { isLikelyOwnerRepo } from '@/lib/github-repo-search';

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

const SORT_OPTIONS: { label: string; value: IssueSortBy }[] = [
  { label: 'Recently updated', value: 'updated_at' },
  { label: 'Created date', value: 'created_at' },
  { label: 'Most comments', value: 'comments' },
  { label: 'Issue number', value: 'number' },
  { label: 'Title', value: 'title' },
  { label: 'State', value: 'state' },
  { label: 'Repository', value: 'repo' },
];

const fieldLabel =
  'mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]';
const fieldInput =
  'w-full rounded-md border bg-[color:var(--gs-bg-1)] px-2.5 py-1.5 text-[13px] text-[color:var(--gs-fg-0)] placeholder:text-[color:var(--gs-fg-3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gs-accent-primary)]/60';

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
  // Mobile filters collapsed by default. The expand toggle is only consulted
  // by the mobile branch; on sm+ the filter form is always inline.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const repoIsExact = isLikelyOwnerRepo(query.repo);

  const activeFilterChips: string[] = [];
  if (query.repo) activeFilterChips.push(`Repo: ${query.repo}`);
  if (query.state) activeFilterChips.push(`State: ${query.state}`);
  const nonDefaultSort = query.sortBy !== 'updated_at' || query.sortDirection !== 'desc';
  if (nonDefaultSort) {
    activeFilterChips.push(`Sort: ${query.sortBy.replace('_', ' ')} ${query.sortDirection}`);
  }
  const activeFilterCount = activeFilterChips.length;

  // The single, shared search row used at the top on every breakpoint.
  const searchRow = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <RepositorySearchInput
          inputId="gs-repo-search-input"
          value={query.repo}
          onChange={(next) => onChange({ repo: next })}
          onSelect={(fullName) => onChange({ repo: fullName })}
          onSubmit={(value) => {
            if (isLikelyOwnerRepo(value)) {
              void onPreviewRepository(value);
            }
          }}
          recentRepositories={recentRepositories}
          disabled={isSyncing}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-row sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreviewRepository(query.repo)}
          disabled={!repoIsExact || isPreviewing || isSyncing}
          iconLeft={<Eye size={13} />}
        >
          {isPreviewing ? 'Previewing…' : 'Preview'}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => void onSyncRepository(query.repo)}
          disabled={!repoIsExact || isSyncing}
          iconLeft={<RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />}
        >
          {isSyncing ? 'Syncing…' : 'Sync'}
        </Button>
      </div>
    </div>
  );

  // Inline filters form (visible inline on desktop, gated by toggle on mobile).
  const filtersForm = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (hasPendingChanges) onApply();
      }}
      className="grid gap-2 sm:grid-cols-3"
    >
      <label>
        <span className={fieldLabel}>State</span>
        <select
          value={query.state}
          onChange={(event) => onChange({ state: event.target.value as IssueState })}
          className={fieldInput}
          style={{ borderColor: 'var(--gs-border-default)' }}
        >
          <option value="">All states</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </label>

      <label>
        <span className={fieldLabel}>Sort by</span>
        <select
          value={query.sortBy}
          onChange={(event) => onChange({ sortBy: event.target.value as IssueSortBy })}
          className={fieldInput}
          style={{ borderColor: 'var(--gs-border-default)' }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={fieldLabel}>Direction</span>
        <select
          value={query.sortDirection}
          onChange={(event) => onChange({ sortDirection: event.target.value as SortDirection })}
          className={fieldInput}
          style={{ borderColor: 'var(--gs-border-default)' }}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>

      <div className="col-span-full mt-1 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          iconLeft={<X size={13} />}
        >
          Reset
        </Button>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={!hasPendingChanges}
          iconLeft={<Filter size={13} />}
        >
          Apply
        </Button>
      </div>
    </form>
  );

  return (
    <section data-tour="repo-search">
      {/* MOBILE ------------------------------------------------------------- */}
      <div className="sm:hidden">
        <div
          className="rounded-[10px] border p-2"
          style={{
            background: 'var(--gs-bg-1)',
            borderColor: 'var(--gs-border-default)',
          }}
        >
          {searchRow}

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors"
              style={{
                background: mobileFiltersOpen ? 'var(--gs-accent-soft)' : 'var(--gs-bg-2)',
                color: mobileFiltersOpen
                  ? 'var(--gs-accent-primary)'
                  : 'var(--gs-fg-1)',
              }}
            >
              <SlidersHorizontal size={11} />
              Filters
              {activeFilterCount > 0 ? (
                <span
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[10px] tabular-nums"
                  style={{
                    background: 'var(--gs-accent-primary)',
                    color: 'white',
                  }}
                >
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDown
                size={11}
                style={{
                  transform: mobileFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 180ms var(--ease-standard)',
                }}
              />
            </button>
            {hasPendingChanges ? <Tag active>Pending</Tag> : null}
          </div>

          {mobileFiltersOpen ? (
            <div
              className="mt-2 rounded-[8px] border p-2.5"
              style={{
                background: 'var(--gs-bg-0)',
                borderColor: 'var(--gs-border-subtle)',
              }}
            >
              {filtersForm}
            </div>
          ) : null}
        </div>

        {/* Scope chips below the search card */}
        {recentRepositories.length > 0 ? (
          <div className="mt-2 -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
            <Tag active={!activeRepositoryScope} onClick={onClearRepositoryScope}>
              All
            </Tag>
            {recentRepositories.slice(0, 4).map((repository) => (
              <button
                key={repository.id}
                type="button"
                onClick={() => onScopeRepository(repository.full_name)}
                className="inline-flex h-8 max-w-[60vw] flex-shrink-0 items-center rounded-full border px-3 text-[12.5px] transition-colors"
                style={{
                  borderColor:
                    activeRepositoryScope === repository.full_name
                      ? 'color-mix(in oklch, var(--gs-accent-primary) 40%, transparent)'
                      : 'var(--gs-border-default)',
                  background:
                    activeRepositoryScope === repository.full_name
                      ? 'var(--gs-accent-soft)'
                      : 'transparent',
                  color:
                    activeRepositoryScope === repository.full_name
                      ? 'var(--gs-accent-primary)'
                      : 'var(--gs-fg-1)',
                }}
                title={repository.full_name}
              >
                <span className="truncate">{repository.full_name}</span>
              </button>
            ))}
            {recentRepositories.length > 4 ? (
              <span
                className="flex-shrink-0 text-[11px]"
                style={{ color: 'var(--gs-fg-2)' }}
              >
                +{recentRepositories.length - 4}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* TABLET / DESKTOP --------------------------------------------------- */}
      <div className="hidden sm:block">
        <div
          className="rounded-[12px] border p-3 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
          style={{
            background: 'var(--gs-bg-1)',
            borderColor: 'var(--gs-border-default)',
          }}
        >
          {searchRow}
          <div className="mt-3">{filtersForm}</div>
        </div>

        {/* Active filter chips + scope chips */}
        {(activeFilterChips.length > 0 || recentRepositories.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {activeFilterChips.map((chip) => (
              <Tag key={chip}>{chip}</Tag>
            ))}
            {hasPendingChanges ? <Tag active>Pending changes</Tag> : null}

            {recentRepositories.length > 0 ? (
              <>
                <span
                  className="ml-2 mr-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--gs-fg-2)' }}
                >
                  Scope
                </span>
                <Tag active={!activeRepositoryScope} onClick={onClearRepositoryScope}>
                  Workspace
                </Tag>
                {recentRepositories.slice(0, 5).map((repository) => (
                  <span
                    key={repository.id}
                    className="inline-flex items-center overflow-hidden rounded-full border text-[12px]"
                    style={{
                      borderColor:
                        activeRepositoryScope === repository.full_name
                          ? 'color-mix(in oklch, var(--gs-accent-primary) 40%, transparent)'
                          : 'var(--gs-border-default)',
                      background:
                        activeRepositoryScope === repository.full_name
                          ? 'var(--gs-accent-soft)'
                          : 'transparent',
                      color:
                        activeRepositoryScope === repository.full_name
                          ? 'var(--gs-accent-primary)'
                          : 'var(--gs-fg-1)',
                    }}
                    title={`${repository.issue_pages_synced} GitHub issue pages indexed`}
                  >
                    <button
                      type="button"
                      onClick={() => onScopeRepository(repository.full_name)}
                      className="px-2.5 py-0.5"
                    >
                      {repository.full_name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${repository.full_name} from workspace`}
                      disabled={removingRepositoryId === repository.id}
                      onClick={() => void onRemoveRepository(repository)}
                      className="mr-1 rounded-full p-0.5 opacity-60 transition-colors hover:bg-[color:var(--gs-state-danger)]/15 hover:text-[color:var(--gs-state-danger)] hover:opacity-100 disabled:opacity-30"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
