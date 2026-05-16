'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createOrRestoreGuestSession,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  startOAuth,
  type AuthUser,
  type GuestSession,
  type LoginPayload,
  type SignupPayload,
} from '@/lib/auth';

const TOKEN_STORAGE_KEY = 'gitsense_access_token';
const GUEST_SESSION_STORAGE_KEY = 'gitsense_guest_session_id';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  guestSession: GuestSession | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  completeOAuthLogin: (accessToken: string) => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  ensureGuestSession: () => Promise<GuestSession>;
  refreshGuestSession: () => Promise<GuestSession | null>;
  startProviderLogin: (provider: 'github' | 'google') => Promise<string>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      queueMicrotask(() => setStatus('unauthenticated'));
      return;
    }

    getCurrentUser(storedToken)
      .then((restoredUser) => {
        setToken(storedToken);
        setUser(restoredUser);
        setStatus('authenticated');
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        setStatus('unauthenticated');
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      guestSession,
      status,
      async login(payload) {
        const response = await loginRequest({
          ...payload,
          guest_session_id: guestSession?.guest_session_id,
        });
        window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
        setToken(response.access_token);
        setUser(response.user);
        setStatus('authenticated');
      },
      async signup(payload) {
        const response = await signupRequest({
          ...payload,
          guest_session_id: guestSession?.guest_session_id,
        });
        window.localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
        setToken(response.access_token);
        setUser(response.user);
        setStatus('authenticated');
      },
      async logout() {
        await logoutRequest(token);
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
        setStatus('unauthenticated');
        router.push('/login');
      },
      async completeOAuthLogin(accessToken) {
        const restoredUser = await getCurrentUser(accessToken);
        window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        setToken(accessToken);
        setUser(restoredUser);
        setStatus('authenticated');
      },
      async refreshUser() {
        if (!token) {
          return null;
        }

        const restoredUser = await getCurrentUser(token);
        setUser(restoredUser);
        return restoredUser;
      },
      async ensureGuestSession() {
        const storedGuestSessionId = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
        const session = await createOrRestoreGuestSession(storedGuestSessionId);
        window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, session.guest_session_id);
        setGuestSession(session);
        return session;
      },
      async refreshGuestSession() {
        const storedGuestSessionId = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);

        if (!storedGuestSessionId) {
          return null;
        }

        const session = await createOrRestoreGuestSession(storedGuestSessionId);
        window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, session.guest_session_id);
        setGuestSession(session);
        return session;
      },
      async startProviderLogin(provider) {
        const response = await startOAuth(provider, guestSession?.guest_session_id);

        if (response.configured && response.authorization_url) {
          window.location.assign(response.authorization_url);
          return response.message;
        }

        throw new Error(response.message);
      },
    }),
    [guestSession, router, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
