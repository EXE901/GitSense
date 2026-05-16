import type { OwnershipHeaders } from './issues';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export type RepositoryHistoryItem = {
  id: number;
  full_name: string;
  is_demo: boolean;
  expires_at: string | null;
  last_synced_at: string | null;
  html_url: string | null;
  description: string | null;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  total_issues_count: number;
  closed_issues_count: number;
  issue_pages_synced: number;
  issue_pages_exhausted: boolean;
};

export async function fetchRepositories(
  ownership?: OwnershipHeaders,
  signal?: AbortSignal
): Promise<RepositoryHistoryItem[]> {
  const response = await fetch(`${API_BASE_URL}/repositories`, {
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error('Unable to load repository history.');
  }

  const data = await response.json();
  return data.repositories ?? [];
}

export async function removeRepository(
  repositoryId: number,
  ownership?: OwnershipHeaders
): Promise<RepositoryHistoryItem> {
  const response = await fetch(`${API_BASE_URL}/repositories/${repositoryId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: buildOwnershipHeaders(ownership),
  });

  if (!response.ok) {
    throw new Error('Unable to remove repository from workspace.');
  }

  const data = await response.json();
  return data.repository;
}

function buildOwnershipHeaders(ownership?: OwnershipHeaders): HeadersInit {
  const headers: Record<string, string> = {};

  if (ownership?.token) {
    headers.Authorization = `Bearer ${ownership.token}`;
  } else if (ownership?.guestSessionId) {
    headers['X-Guest-Session-Id'] = ownership.guestSessionId;
  }

  return headers;
}
