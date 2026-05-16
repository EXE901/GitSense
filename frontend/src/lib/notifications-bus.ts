import {
  safeExternalHref,
  safeRouteHref,
  sanitizeText,
} from './share-safety';

export type LocalNotificationKind =
  | 'verification_email_sent'
  | 'password_changed'
  | 'export_completed'
  | 'workspace_analytics_refreshed'
  | 'repository_added'
  | 'repository_removed'
  | 'repository_sync_failed'
  | 'guest_limit_warning'
  | 'oauth_link_updated'
  | 'session_revoked';

export type LocalNotificationSeverity = 'info' | 'success' | 'warning' | 'danger' | 'ai';

export type LocalNotification = {
  id: string;
  kind: LocalNotificationKind;
  title: string;
  description: string;
  timestamp: string;
  href: string;
  repository?: string;
  severity: LocalNotificationSeverity;
};

const STORAGE_KEY = 'gitsense:local-notifications';
const DEMO_SEED_FLAG_KEY = 'gitsense:demo:notifications-seeded';
const MAX_LOCAL_NOTIFICATIONS = 30;
const BUS_EVENT_NAME = 'gitsense:notifications-changed';

const allowedKinds: ReadonlySet<LocalNotificationKind> = new Set([
  'verification_email_sent',
  'password_changed',
  'export_completed',
  'workspace_analytics_refreshed',
  'repository_added',
  'repository_removed',
  'repository_sync_failed',
  'guest_limit_warning',
  'oauth_link_updated',
  'session_revoked',
]);

const allowedSeverities: ReadonlySet<LocalNotificationSeverity> = new Set([
  'info',
  'success',
  'warning',
  'danger',
  'ai',
]);

function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }

  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeHref(href: string | undefined, fallback = '/dashboard'): string {
  if (!href) {
    return fallback;
  }

  return href.startsWith('http')
    ? safeExternalHref(href, fallback)
    : safeRouteHref(href, fallback);
}

function isLocalNotification(value: unknown): value is LocalNotification {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string'
    && typeof candidate.kind === 'string'
    && allowedKinds.has(candidate.kind as LocalNotificationKind)
    && typeof candidate.title === 'string'
    && typeof candidate.description === 'string'
    && typeof candidate.timestamp === 'string'
    && typeof candidate.href === 'string'
    && typeof candidate.severity === 'string'
    && allowedSeverities.has(candidate.severity as LocalNotificationSeverity)
  );
}

export function readLocalNotifications(): LocalNotification[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    return parsed
      .filter(isLocalNotification)
      .slice(0, MAX_LOCAL_NOTIFICATIONS);
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return [];
  }
}

function writeLocalNotifications(notifications: LocalNotification[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications.slice(0, MAX_LOCAL_NOTIFICATIONS))
    );

    window.dispatchEvent(new CustomEvent(BUS_EVENT_NAME));
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export function pushLocalNotification(
  notification: Omit<LocalNotification, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
  }
): LocalNotification | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!allowedKinds.has(notification.kind) || !allowedSeverities.has(notification.severity)) {
    return null;
  }

  const sanitized: LocalNotification = {
    id: notification.id ? sanitizeText(notification.id).slice(0, 120) : safeRandomId(),
    kind: notification.kind,
    title: sanitizeText(notification.title).slice(0, 120),
    description: sanitizeText(notification.description).slice(0, 240),
    timestamp: notification.timestamp ?? new Date().toISOString(),
    href: sanitizeHref(notification.href),
    repository: notification.repository ? sanitizeText(notification.repository).slice(0, 120) : undefined,
    severity: notification.severity,
  };

  if (!sanitized.title || !sanitized.description) {
    return null;
  }

  const existing = readLocalNotifications();
  const deduped = existing.filter((item) => item.id !== sanitized.id);
  const next = [sanitized, ...deduped].slice(0, MAX_LOCAL_NOTIFICATIONS);

  writeLocalNotifications(next);
  return sanitized;
}

export function clearLocalNotifications(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(BUS_EVENT_NAME));
  } catch {
    // ignore
  }
}

export function subscribeToLocalNotifications(handler: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  function listener() {
    handler();
  }

  window.addEventListener(BUS_EVENT_NAME, listener);
  window.addEventListener('storage', listener);

  return () => {
    window.removeEventListener(BUS_EVENT_NAME, listener);
    window.removeEventListener('storage', listener);
  };
}

export function seedDemoNotificationsOnce(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (window.localStorage.getItem(DEMO_SEED_FLAG_KEY) === 'true') {
      return;
    }
    window.localStorage.setItem(DEMO_SEED_FLAG_KEY, 'true');
  } catch {
    return;
  }

  const now = Date.now();
  const minutes = (m: number) => new Date(now - m * 60_000).toISOString();

  const seed: Array<Omit<LocalNotification, 'id' | 'timestamp'> & { timestamp: string; id: string }> = [
    {
      id: 'demo-analytics-refreshed',
      kind: 'workspace_analytics_refreshed',
      title: 'Workspace analytics refreshed',
      description: 'Cycle time, contributor signal, and label distribution updated from latest sync.',
      timestamp: minutes(2),
      href: '/analytics',
      severity: 'ai',
    },
    {
      id: 'demo-repo-added-vscode',
      kind: 'repository_added',
      title: 'Repository added to workspace',
      description: 'microsoft/vscode is now tracked. Issue and PR signal will refresh hourly.',
      timestamp: minutes(35),
      href: '/repositories',
      repository: 'microsoft/vscode',
      severity: 'success',
    },
    {
      id: 'demo-export-completed',
      kind: 'export_completed',
      title: 'Workspace export completed',
      description: 'gitsense-workspace-demo.csv generated with sanitized issue analytics.',
      timestamp: minutes(90),
      href: '/dashboard',
      severity: 'info',
    },
    {
      id: 'demo-guest-warning',
      kind: 'guest_limit_warning',
      title: 'Demo workspace limit reminder',
      description: 'You are exploring GitSense in demo mode. Sign up to keep long-term repository history.',
      timestamp: minutes(180),
      href: '/signup',
      severity: 'warning',
    },
  ];

  for (const notification of seed) {
    pushLocalNotification(notification);
  }
}
