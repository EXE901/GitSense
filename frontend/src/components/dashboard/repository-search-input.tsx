'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Loader2, Search, Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  isLikelyOwnerRepo,
  searchGitHubRepositories,
  SUGGESTED_DEMO_REPOSITORIES,
  type GitHubRepoSuggestion,
} from '@/lib/github-repo-search';
import type { RepositoryHistoryItem } from '@/lib/repositories';

type RepositorySearchInputProps = {
  value: string;
  onChange: (next: string) => void;
  onSelect: (fullName: string) => void;
  onSubmit?: (value: string) => void;
  recentRepositories?: RepositoryHistoryItem[];
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  className?: string;
};

type Item =
  | { kind: 'recent'; full: string }
  | { kind: 'suggestion'; data: GitHubRepoSuggestion }
  | { kind: 'demo'; data: GitHubRepoSuggestion };

const DEBOUNCE_MS = 320;
const MIN_QUERY_LENGTH = 2;

/**
 * RepositorySearchInput — predictive autocomplete for GitHub repositories.
 *
 * Accepts both repo-only fuzzy queries (e.g. "react") and exact owner/repo
 * strings (e.g. "vercel/next.js"). Operational style: GitHub-native,
 * compact, calm — not a flashy command palette.
 */
export function RepositorySearchInput({
  value,
  onChange,
  onSelect,
  onSubmit,
  recentRepositories = [],
  placeholder = 'Search repositories — try “next”, “linux”, or facebook/react',
  disabled = false,
  inputId,
  className,
}: RepositorySearchInputProps) {
  const generatedId = useId();
  const listboxId = `${inputId ?? generatedId}-listbox`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [remoteResults, setRemoteResults] = useState<GitHubRepoSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = value.trim();
  const hasSlash = trimmed.includes('/');
  const isExact = isLikelyOwnerRepo(trimmed);
  const shouldSearchRemote = !hasSlash && trimmed.length >= MIN_QUERY_LENGTH;

  // Debounced GitHub search — cancels in-flight requests and resets state
  // inside the timeout body so we never call setState eagerly on render.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!shouldSearchRemote) {
        abortRef.current?.abort();
        setRemoteResults([]);
        setSearchError(null);
        setIsLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setSearchError(null);

      searchGitHubRepositories(trimmed, controller.signal)
        .then((results) => {
          if (controller.signal.aborted) return;
          setRemoteResults(results);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setRemoteResults([]);
          setSearchError(
            error instanceof Error ? error.message : 'Search temporarily unavailable.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [shouldSearchRemote, trimmed]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Composite list — recents + demos when idle, remote results when typing.
  const items: Item[] = useMemo(() => {
    if (hasSlash) {
      return [];
    }
    if (shouldSearchRemote) {
      return remoteResults.map((data) => ({ kind: 'suggestion', data }) as Item);
    }
    const recents = recentRepositories.slice(0, 4).map<Item>((repo) => ({
      kind: 'recent',
      full: repo.full_name,
    }));
    const demos = SUGGESTED_DEMO_REPOSITORIES.map<Item>((data) => ({ kind: 'demo', data }));
    return [...recents, ...demos];
  }, [hasSlash, shouldSearchRemote, remoteResults, recentRepositories]);

  // Clamp activeIndex without an effect — avoids cascading renders.
  const clampedActiveIndex =
    items.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), items.length - 1);

  const handleSelect = useCallback(
    (fullName: string) => {
      onSelect(fullName);
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect],
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      if (items.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      if (items.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'Enter') {
      if (isOpen && clampedActiveIndex >= 0 && items[clampedActiveIndex]) {
        event.preventDefault();
        const selected = items[clampedActiveIndex];
        const full = selected.kind === 'recent' ? selected.full : selected.data.fullName;
        handleSelect(full);
        return;
      }
      if (onSubmit) {
        event.preventDefault();
        onSubmit(trimmed);
      }
    }
  }

  const showDropdown =
    isOpen &&
    !hasSlash &&
    (items.length > 0 || isLoading || searchError !== null || shouldSearchRemote);

  const recentCount = Math.min(recentRepositories.length, 4);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <Search
          size={13}
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--gs-fg-2)' }}
        />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && clampedActiveIndex >= 0
              ? `${listboxId}-option-${clampedActiveIndex}`
              : undefined
          }
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-9 w-full rounded-md border bg-[color:var(--gs-bg-1)] px-8 text-[13px] text-[color:var(--gs-fg-0)] placeholder:text-[color:var(--gs-fg-3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gs-accent-primary)]/60 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--gs-border-default)' }}
        />
        {(isLoading || isExact) && (
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Loader2
                size={13}
                className="animate-spin"
                aria-label="Searching"
                style={{ color: 'var(--gs-fg-2)' }}
              />
            ) : (
              <span
                className="rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em]"
                style={{
                  background: 'var(--gs-accent-soft)',
                  borderColor:
                    'color-mix(in oklch, var(--gs-accent-primary) 35%, transparent)',
                  color: 'var(--gs-accent-primary)',
                }}
              >
                Ready
              </span>
            )}
          </div>
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Repository suggestions"
          className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-[60vh] overflow-y-auto overflow-x-hidden rounded-md border shadow-[var(--shadow-2)] sm:max-h-80"
          style={{
            background: 'var(--gs-bg-1)',
            borderColor: 'var(--gs-border-default)',
          }}
        >
          {!shouldSearchRemote && recentCount === 0 && (
            <SectionLabel>Suggested repositories</SectionLabel>
          )}
          {!shouldSearchRemote && recentCount > 0 && (
            <>
              <SectionLabel>Recently synced</SectionLabel>
              {recentRepositories.slice(0, 4).map((repo, index) => {
                const isActive = clampedActiveIndex === index;
                return (
                  <SuggestionRow
                    key={`recent-${repo.id}`}
                    optionId={`${listboxId}-option-${index}`}
                    active={isActive}
                    fullName={repo.full_name}
                    description={repo.description ?? null}
                    stars={repo.stars_count}
                    language={null}
                    avatarUrl={null}
                    onSelect={() => handleSelect(repo.full_name)}
                    onMouseEnter={() => setActiveIndex(index)}
                    badge="Recent"
                  />
                );
              })}
              <SectionLabel>Or try a popular repository</SectionLabel>
            </>
          )}

          {!shouldSearchRemote &&
            SUGGESTED_DEMO_REPOSITORIES.map((data, idx) => {
              const index = recentCount + idx;
              const isActive = clampedActiveIndex === index;
              return (
                <SuggestionRow
                  key={`demo-${data.fullName}`}
                  optionId={`${listboxId}-option-${index}`}
                  active={isActive}
                  fullName={data.fullName}
                  description={data.description}
                  stars={data.stars}
                  language={data.language}
                  avatarUrl={data.avatarUrl}
                  onSelect={() => handleSelect(data.fullName)}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              );
            })}

          {shouldSearchRemote && isLoading && remoteResults.length === 0 && <SkeletonRows />}

          {shouldSearchRemote && !isLoading && remoteResults.length === 0 && !searchError && (
            <div className="px-3 py-5 text-center text-[12.5px]" style={{ color: 'var(--gs-fg-2)' }}>
              No repositories found for{' '}
              <span style={{ color: 'var(--gs-fg-0)' }}>{trimmed}</span>.
              <p className="mt-1 text-[11px]" style={{ color: 'var(--gs-fg-3)' }}>
                Try the full <code className="font-mono">owner/repo</code> form to sync directly.
              </p>
            </div>
          )}

          {shouldSearchRemote && searchError && (
            <div
              className="px-3 py-2 text-[11.5px]"
              style={{ color: 'var(--gs-state-warning)' }}
            >
              {searchError} — type the full <code className="font-mono">owner/repo</code> to continue.
            </div>
          )}

          {shouldSearchRemote &&
            remoteResults.map((data, idx) => {
              const isActive = clampedActiveIndex === idx;
              return (
                <SuggestionRow
                  key={`remote-${data.fullName}`}
                  optionId={`${listboxId}-option-${idx}`}
                  active={isActive}
                  fullName={data.fullName}
                  description={data.description}
                  stars={data.stars}
                  language={data.language}
                  avatarUrl={data.avatarUrl}
                  onSelect={() => handleSelect(data.fullName)}
                  onMouseEnter={() => setActiveIndex(idx)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.16em]"
      style={{ color: 'var(--gs-fg-3)' }}
    >
      {children}
    </div>
  );
}

type SuggestionRowProps = {
  optionId: string;
  active: boolean;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  avatarUrl: string | null;
  onSelect: () => void;
  onMouseEnter: () => void;
  badge?: string;
};

function SuggestionRow({
  optionId,
  active,
  fullName,
  description,
  stars,
  language,
  avatarUrl,
  onSelect,
  onMouseEnter,
  badge,
}: SuggestionRowProps) {
  return (
    <button
      type="button"
      role="option"
      id={optionId}
      aria-selected={active}
      tabIndex={-1}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect();
      }}
      onMouseEnter={onMouseEnter}
      className="flex w-full min-h-[44px] items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors"
      style={{
        background: active ? 'var(--gs-bg-2)' : 'transparent',
        color: 'var(--gs-fg-0)',
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          width={22}
          height={22}
          className="h-[22px] w-[22px] flex-shrink-0 rounded-full object-cover"
          style={{
            border: '1px solid var(--gs-border-default)',
            background: 'var(--gs-bg-2)',
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{
            background: 'var(--gs-bg-2)',
            border: '1px solid var(--gs-border-default)',
            color: 'var(--gs-fg-2)',
          }}
        >
          {fullName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium" style={{ color: 'var(--gs-fg-0)' }}>
            {fullName}
          </span>
          {badge && (
            <span
              className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]"
              style={{
                background: 'var(--gs-accent-soft)',
                borderColor:
                  'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
                color: 'var(--gs-accent-primary)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p
            className="mt-0.5 truncate text-[11px]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            {description}
          </p>
        )}
      </div>
      <div
        className="flex flex-shrink-0 items-center gap-2 text-[11px]"
        style={{ color: 'var(--gs-fg-2)' }}
      >
        {language && <span className="hidden sm:inline">{language}</span>}
        {stars > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star size={10} aria-hidden="true" />
            {formatStars(stars)}
          </span>
        )}
      </div>
    </button>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-1 p-2" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex animate-pulse items-center gap-2.5 rounded-md px-3 py-2">
          <div
            className="h-[22px] w-[22px] rounded-full"
            style={{ background: 'var(--gs-bg-2)' }}
          />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-1/2 rounded" style={{ background: 'var(--gs-bg-2)' }} />
            <div className="h-2 w-3/4 rounded" style={{ background: 'var(--gs-bg-2)' }} />
          </div>
          <div className="h-2 w-10 rounded" style={{ background: 'var(--gs-bg-2)' }} />
        </div>
      ))}
    </div>
  );
}

function formatStars(stars: number): string {
  if (stars >= 1000) {
    const k = stars / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  return stars.toString();
}
