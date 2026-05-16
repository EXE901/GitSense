export type IssueState = "open" | "closed" | "";

export type IssueSortBy =
  | "created_at"
  | "updated_at"
  | "comments"
  | "number"
  | "title"
  | "state"
  | "repo";

export type SortDirection = "asc" | "desc";

export type IssueQuery = {
  repo: string;
  state: IssueState;
  page: number;
  limit: number;
  sortBy: IssueSortBy;
  sortDirection: SortDirection;
};

export type StoredIssue = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  comments: number;
  labels: string[];
  updated_at: string;
  created_at: string;
  url: string;
  repo: string;
};

export type IssuesResponse = {
  total_issues: number;
  page: number;
  limit: number;
  issues: StoredIssue[];
};

export type OwnershipHeaders = {
  token?: string | null;
  guestSessionId?: string | null;
};

export type GuestUsage = {
  guest_session_id: string;
  repo_limit: number;
  used_repositories: number;
  remaining_repositories: number;
  expires_at: string;
};

export type PreviewRepository = {
  full_name: string;
  description: string | null;
  html_url: string | null;
  stars_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  closed_issues_count: number;
  total_issues_count: number;
  language: string | null;
};

export type PreviewRepositoryResponse = {
  repo: string;
  repository: PreviewRepository;
  total_issues: number;
  indexed_issues: number;
  page: number;
  limit: number;
  issues: StoredIssue[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function fetchStoredIssues(
  query: IssueQuery,
  ownership?: OwnershipHeaders,
  signal?: AbortSignal
): Promise<IssuesResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort_by: query.sortBy,
    sort_direction: query.sortDirection,
  });

  if (query.repo.trim()) {
    params.set("repo", query.repo.trim());
  }

  if (query.state) {
    params.set("state", query.state);
  }

  const response = await fetch(`${API_BASE_URL}/issues?${params.toString()}`, {
    credentials: "include",
    headers: buildOwnershipHeaders(ownership),
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load stored issues.");
  }

  return response.json();
}

export async function scrapeRepository(repository: string): Promise<{
  repo: string;
  total_issues: number;
  indexed_issues: number;
  issue_pages_synced: number;
  issue_pages_exhausted: boolean;
  issues: StoredIssue[];
  guest_usage?: GuestUsage;
}> {
  return scrapeRepositoryWithOwnership(repository);
}

export async function scrapeRepositoryWithOwnership(
  repository: string,
  ownership?: OwnershipHeaders
): Promise<{
  repo: string;
  total_issues: number;
  indexed_issues: number;
  issue_pages_synced: number;
  issue_pages_exhausted: boolean;
  issues: StoredIssue[];
  guest_usage?: GuestUsage;
}> {
  const normalizedRepository = repository.trim();
  const [owner, repo] = normalizedRepository.split("/");

  if (!owner || !repo) {
    throw new Error("Use the owner/repo format to sync a repository.");
  }

  const response = await fetch(
    `${API_BASE_URL}/scrape/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    {
      credentials: "include",
      headers: buildOwnershipHeaders(ownership),
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Unable to sync issues from GitHub."));
  }

  return response.json();
}

export async function previewRepository(
  repository: string,
  query: IssueQuery,
  signal?: AbortSignal
): Promise<PreviewRepositoryResponse> {
  const normalizedRepository = repository.trim();
  const [owner, repo] = normalizedRepository.split("/");

  if (!owner || !repo) {
    throw new Error("Use the owner/repo format to preview a repository.");
  }

  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sortBy === "comments" ? "comments" : query.sortBy === "created_at" ? "created" : "updated",
    direction: query.sortDirection,
  });

  if (query.state) {
    params.set("state", query.state);
  }

  const response = await fetch(
    `${API_BASE_URL}/preview/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}?${params.toString()}`,
    {
      credentials: "include",
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Unable to preview repository from GitHub."));
  }

  return response.json();
}

function buildOwnershipHeaders(ownership?: OwnershipHeaders): HeadersInit {
  const headers: Record<string, string> = {};

  if (ownership?.token) {
    headers.Authorization = `Bearer ${ownership.token}`;
  } else if (ownership?.guestSessionId) {
    headers["X-Guest-Session-Id"] = ownership.guestSessionId;
  }

  return headers;
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === "string") {
      return data.detail;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
