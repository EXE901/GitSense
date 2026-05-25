/**
 * Lightweight GitHub repository search client.
 *
 * - Calls the public GitHub search endpoint without an auth token (60 req/h/IP).
 * - Caches recent query results in-memory for the session.
 * - Supports request cancellation via AbortSignal.
 * - Boosts exact repo-name matches to the top of the result list.
 *
 * No secrets are sent. This runs purely client-side and is safe to fail —
 * the existing manual `owner/repo` input always remains usable.
 */

export type GitHubRepoSuggestion = {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  language: string | null;
  avatarUrl: string | null;
  htmlUrl: string;
};

type CacheEntry = {
  expiresAt: number;
  results: GitHubRepoSuggestion[];
};

const SEARCH_ENDPOINT = 'https://api.github.com/search/repositories';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 32;
const cache = new Map<string, CacheEntry>();

export function isLikelyOwnerRepo(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes('/')) {
    return false;
  }
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    return false;
  }
  const [owner, repo] = parts;
  return Boolean(owner && repo && owner.length >= 1 && repo.length >= 1);
}

export async function searchGitHubRepositories(
  query: string,
  signal?: AbortSignal,
): Promise<GitHubRepoSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const params = new URLSearchParams({
    q: `${trimmed} in:name`,
    sort: 'stars',
    order: 'desc',
    per_page: '8',
  });

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub search failed (${response.status})`);
  }

  const data = (await response.json()) as { items?: RawRepoItem[] };
  const suggestions = mapAndRank(data.items ?? [], trimmed);
  storeInCache(cacheKey, suggestions);
  return suggestions;
}

type RawRepoItem = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  owner: { login: string; avatar_url: string | null } | null;
};

function mapAndRank(items: RawRepoItem[], query: string): GitHubRepoSuggestion[] {
  const normalized = query.toLowerCase();
  const mapped: GitHubRepoSuggestion[] = items
    .filter((item) => Boolean(item.owner?.login))
    .map((item) => ({
      fullName: item.full_name,
      owner: item.owner?.login ?? '',
      name: item.name,
      description: item.description,
      stars: item.stargazers_count ?? 0,
      language: item.language,
      avatarUrl: item.owner?.avatar_url ?? null,
      htmlUrl: item.html_url,
    }));

  return mapped.sort((a, b) => {
    const aExact = a.name.toLowerCase() === normalized ? 0 : 1;
    const bExact = b.name.toLowerCase() === normalized ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return b.stars - a.stars;
  });
}

function storeInCache(key: string, results: GitHubRepoSuggestion[]): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    results,
  });
}

export const SUGGESTED_DEMO_REPOSITORIES: GitHubRepoSuggestion[] = [
  {
    fullName: 'facebook/react',
    owner: 'facebook',
    name: 'react',
    description: 'The library for web and native user interfaces.',
    stars: 230000,
    language: 'JavaScript',
    avatarUrl: 'https://avatars.githubusercontent.com/u/69631?v=4',
    htmlUrl: 'https://github.com/facebook/react',
  },
  {
    fullName: 'vercel/next.js',
    owner: 'vercel',
    name: 'next.js',
    description: 'The React Framework for the Web.',
    stars: 125000,
    language: 'TypeScript',
    avatarUrl: 'https://avatars.githubusercontent.com/u/14985020?v=4',
    htmlUrl: 'https://github.com/vercel/next.js',
  },
  {
    fullName: 'microsoft/typescript',
    owner: 'microsoft',
    name: 'typescript',
    description: 'TypeScript is a superset of JavaScript that compiles to clean JavaScript output.',
    stars: 100000,
    language: 'TypeScript',
    avatarUrl: 'https://avatars.githubusercontent.com/u/6154722?v=4',
    htmlUrl: 'https://github.com/microsoft/TypeScript',
  },
  {
    fullName: 'torvalds/linux',
    owner: 'torvalds',
    name: 'linux',
    description: 'Linux kernel source tree.',
    stars: 180000,
    language: 'C',
    avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4',
    htmlUrl: 'https://github.com/torvalds/linux',
  },
];
