const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  auth_provider: string;
  profile_image: string | null;
  github_id: string | null;
  github_username: string | null;
  github_profile_url: string | null;
  github_avatar_url: string | null;
  github_display_name: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  pending_email: string | null;
  pending_email_requested_at: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type LoginPayload = {
  email: string;
  password: string;
  guest_session_id?: string | null;
};

export type SignupPayload = {
  email: string;
  username: string;
  password: string;
  guest_session_id?: string | null;
};

export type OAuthStartResponse = {
  provider: string;
  configured: boolean;
  authorization_url: string | null;
  message: string;
};

export type AccountProfilePayload = {
  username?: string;
  display_name?: string;
  email?: string;
};

export type GuestSession = {
  guest_session_id: string;
  repo_limit: number;
  used_repositories: number;
  remaining_repositories: number;
  expires_at: string;
};

export type AuthSession = {
  id: string;
  device_label: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  is_current: boolean;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return postAuthRequest('/auth/login', payload);
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  return postAuthRequest('/auth/signup', payload);
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to restore your session.'));
  }

  return response.json();
}

export async function logout(token: string | null): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch(() => undefined);
}

export async function resendVerification(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/verification/resend`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to start verification flow.'));
  }

  const data = await response.json();
  return data.message ?? 'Verification flow prepared.';
}

export async function confirmEmailVerification(verificationToken: string): Promise<AuthUser> {
  const params = new URLSearchParams({ token: verificationToken });
  const response = await fetch(`${API_BASE_URL}/auth/verification/confirm?${params.toString()}`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to verify email.'));
  }

  return response.json();
}

export async function updateAccountProfile(
  token: string,
  payload: AccountProfilePayload
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/account`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to update account.'));
  }

  return response.json();
}

export async function deleteAccount(token: string, confirmation: string, password?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/account`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmation, password: password || null }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to delete account.'));
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to send reset email.'));
  }

  const data = await response.json();
  return data.message ?? 'If an account exists, a reset link has been sent.';
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/password/reset`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to reset password.'));
  }

  const data = await response.json();
  return data.message ?? 'Password updated. Please sign in again.';
}

export async function checkUsernameAvailability(token: string, username: string): Promise<boolean> {
  const params = new URLSearchParams({ username });
  const response = await fetch(`${API_BASE_URL}/auth/username/check?${params.toString()}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to check username availability.'));
  }

  const data = await response.json();
  return Boolean(data.available);
}

export async function fetchAuthSessions(token: string): Promise<AuthSession[]> {
  const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to load sessions.'));
  }

  return response.json();
}

export async function revokeAuthSession(token: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to revoke session.'));
  }
}

export async function logoutAllOtherSessions(token: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/sessions/logout-all`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to sign out other sessions.'));
  }

  const data = await response.json();
  return data.message ?? 'Other sessions signed out.';
}

export async function startProviderLink(
  token: string,
  provider: 'github' | 'google'
): Promise<OAuthStartResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/providers/${provider}/link/start`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Unable to start ${provider} linking.`));
  }

  return response.json();
}

export async function unlinkProvider(
  token: string,
  provider: 'github' | 'google'
): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/providers/${provider}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Unable to unlink ${provider}.`));
  }

  return response.json();
}

export async function startOAuth(
  provider: 'github' | 'google',
  guestSessionId?: string | null
): Promise<OAuthStartResponse> {
  const params = new URLSearchParams();

  if (guestSessionId) {
    params.set('guest_session_id', guestSessionId);
  }

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/auth/oauth/${provider}/start${query ? `?${query}` : ''}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, `Unable to start ${provider} sign-in.`));
  }

  return response.json();
}

export async function createOrRestoreGuestSession(
  guestSessionId?: string | null
): Promise<GuestSession> {
  const response = await fetch(`${API_BASE_URL}/guest/session`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      guest_session_id: guestSessionId || null,
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to start guest demo session.'));
  }

  return response.json();
}

async function postAuthRequest(
  endpoint: '/auth/login' | '/auth/signup',
  payload: LoginPayload | SignupPayload
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Authentication failed.'));
  }

  return response.json();
}

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.detail === 'string') {
      return data.detail;
    }

    if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      return data.detail[0].msg;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
