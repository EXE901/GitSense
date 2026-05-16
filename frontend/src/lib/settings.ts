import type { AuthUser } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export type TrustTier = 'guest' | 'email_unverified' | 'verified' | 'oauth_verified';

export type UsageSettings = {
  trust_tier: TrustTier;
  sync_limit: number | null;
  sync_limit_window: string | null;
  syncs_used: number | null;
  remaining_syncs: number | null;
  unlimited: boolean;
  reset_at: string | null;
  verification_required: boolean;
  message: string;
};

export type UserSettings = {
  account: {
    name: string;
    email: string;
    username: string;
    auth_provider: string;
    is_email_verified: boolean;
    pending_email: string | null;
    pending_email_requested_at: string | null;
    created_at: string;
    last_login_at: string | null;
    account_type: string;
    trust_tier: TrustTier;
    github_handle: string | null;
    connected_providers: string[];
  };
  workspace: {
    default_repository_scope: string | null;
    remember_last_workspace: boolean;
    pinned_repositories: string | null;
    auto_sync_watched_repos: boolean;
    sync_interval: string;
    dashboard_layout: string;
  };
  notifications: {
    sync_notifications: boolean;
    stale_issue_alerts: boolean;
    spike_detection_alerts: boolean;
    email_notifications: boolean;
    browser_notifications: boolean;
    digest_frequency: string;
    future_ai_insight_preferences: boolean;
  };
  appearance: {
    reduced_motion: boolean;
    compact_dashboard_mode: boolean;
    chart_animations: boolean;
    dashboard_density: string;
    sidebar_collapse_memory: boolean;
    theme_preference: string;
  };
  security: {
    password_reset_available: boolean;
    logout_available: boolean;
    connected_providers: string[];
    last_password_change: string | null;
  };
  usage: UsageSettings;
};

export type UserSettingsUpdate = {
  workspace?: Partial<UserSettings['workspace']>;
  notifications?: Partial<UserSettings['notifications']>;
  appearance?: Partial<UserSettings['appearance']>;
};

export function getUserTrustTier(user: AuthUser | null): TrustTier {
  if (!user) {
    return 'guest';
  }

  if (user.github_id || user.auth_provider.includes('github')) {
    return 'oauth_verified';
  }

  if (user.auth_provider.includes('google')) {
    return 'oauth_verified';
  }

  if (user.is_email_verified) {
    return 'verified';
  }

  return 'email_unverified';
}

export async function fetchUserSettings(token: string, signal?: AbortSignal): Promise<UserSettings> {
  const response = await fetch(`${API_BASE_URL}/auth/settings`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to load settings.'));
  }

  return response.json();
}

export async function updateUserSettings(
  token: string,
  payload: UserSettingsUpdate
): Promise<UserSettings> {
  const response = await fetch(`${API_BASE_URL}/auth/settings`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to save settings.'));
  }

  return response.json();
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === 'string') {
      return data.detail;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
