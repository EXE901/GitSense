'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCheck,
  Circle,
  Download,
  GitPullRequest,
  KeyRound,
  Link2,
  MailCheck,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldAlert,
  Tag,
  Trash2,
  UserCheck,
  UserX,
  XCircle,
} from 'lucide-react';
import { TopbarActionButton } from '@/components/topbar/topbar-action-button';
import {
  loadWorkspaceNotifications,
  type WorkspaceNotification,
} from '@/lib/topbar-workspace';
import {
  readStringArrayFromStorage,
  safeExternalHref,
  safeRouteHref,
  sanitizeText,
} from '@/lib/share-safety';
import { subscribeToLocalNotifications } from '@/lib/notifications-bus';
import type { OwnershipHeaders } from '@/lib/issues';

const READ_STORAGE_KEY = 'gitsense:notifications:read-ids';

type NotificationsCenterProps = {
  ownership: OwnershipHeaders;
  route: string;
  onStatus: (message: string) => void;
};

export function NotificationsCenter({ ownership, route, onStatus }: NotificationsCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [busToken, setBusToken] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setReadIds(new Set(readStringArrayFromStorage(READ_STORAGE_KEY)));
    });
  }, []);

  useEffect(() => {
    return subscribeToLocalNotifications(() => {
      queueMicrotask(() => setBusToken((current) => current + 1));
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });

    loadWorkspaceNotifications(ownership, route, controller.signal)
      .then((items) =>
        setNotifications(
          items
            .map(normalizeNotification)
            .filter((item): item is WorkspaceNotification => item !== null)
        )
      )
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [ownership, route, busToken]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;
  const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);

  function persistReadIds(nextIds: Set<string>) {
    setReadIds(nextIds);
    try {
      window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(nextIds).slice(0, 200)));
    } catch {
      window.localStorage.removeItem(READ_STORAGE_KEY);
    }
  }

  function markAsRead(notification: WorkspaceNotification) {
    if (readIds.has(notification.id)) {
      return;
    }

    const nextIds = new Set(readIds);
    nextIds.add(notification.id);
    persistReadIds(nextIds);
  }

  function markAllAsRead() {
    persistReadIds(new Set(notifications.map((notification) => notification.id)));
    onStatus('Notifications cleared');
  }

  return (
    <div className="relative">
      <TopbarActionButton
        label="Open notifications center"
        title="Notifications"
        icon={<Bell size={16} />}
        badge={unreadCount}
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent sm:hidden"
          />
          <div className="absolute right-0 top-11 z-50 w-[min(94vw,420px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover/95 text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="sticky top-0 z-10 border-b border-border/80 bg-popover/95 p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread · GitHub activity & sync events`
                    : 'GitHub activity, sync events, and intelligence alerts.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!notifications.length || unreadCount === 0}
                onClick={markAllAsRead}
                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-smooth hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Mark all notifications as read"
              >
                <CheckCheck size={14} aria-hidden="true" />
                Mark all read
              </button>
            </div>
          </div>

          <div className="max-h-[min(70vh,620px)] overflow-y-auto p-3 momentum-scroll">
            {isLoading && <NotificationSkeleton />}

            {!isLoading && error && (
              <EmptyNotificationState
                icon={<XCircle size={18} />}
                title="Notifications unavailable"
                description={error}
              />
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <EmptyNotificationState
                icon={<Bell size={18} />}
                title="You're all caught up"
                description="No new workspace activity. Sync a repository or connect GitHub to start surfacing issue events."
              />
            )}

            {!isLoading && !error && notifications.length > 0 && (
              <div className="space-y-4">
                {groupedNotifications.map((group) => (
                  <section key={group.label} className="space-y-2">
                    <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {group.label}
                    </p>
                    {group.items.map((notification) => (
                      <NotificationCard
                        key={notification.id}
                        notification={notification}
                        isUnread={!readIds.has(notification.id)}
                        onRead={() => markAsRead(notification)}
                      />
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  isUnread,
  onRead,
}: {
  notification: WorkspaceNotification;
  isUnread: boolean;
  onRead: () => void;
}) {
  const Icon = notificationIcon[notification.kind] ?? Circle;
  const toneClass = severityTone[notification.severity];
  const isExternal = notification.href.startsWith('http');
  const safeHref = isExternal
    ? safeExternalHref(notification.href, '/issues')
    : safeRouteHref(notification.href, '/issues');

  const content = (
    <div
      className={`group flex gap-3 rounded-xl border p-3 transition-smooth hover:-translate-y-0.5 hover:bg-secondary/40 ${
        isUnread
          ? 'border-primary/30 bg-primary/[0.07] shadow-[0_0_28px_rgba(59,130,246,0.1)]'
          : 'border-border bg-background/35'
      }`}
      onClick={onRead}
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
        {notification.actor?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={notification.actor.avatarUrl} alt="" className="h-full w-full rounded-xl object-cover" />
        ) : (
          <Icon size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
          {isUnread && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_12px_rgba(59,130,246,0.7)]" />}
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notification.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/75">
          <span>{formatRelativeTime(notification.timestamp)}</span>
          {notification.repository && <span className="rounded-full border border-border bg-card px-2 py-0.5">{notification.repository}</span>}
        </div>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a href={safeHref} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={safeHref} className="block">
      {content}
    </Link>
  );
}

function EmptyNotificationState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

function groupNotifications(notifications: WorkspaceNotification[]) {
  const groups = [
    { label: 'Today', items: [] as WorkspaceNotification[] },
    { label: 'Yesterday', items: [] as WorkspaceNotification[] },
    { label: 'Earlier', items: [] as WorkspaceNotification[] },
  ];

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  for (const notification of notifications) {
    const timestamp = new Date(notification.timestamp);

    if (isSameDay(timestamp, today)) {
      groups[0].items.push(notification);
    } else if (isSameDay(timestamp, yesterday)) {
      groups[1].items.push(notification);
    } else {
      groups[2].items.push(notification);
    }
  }

  return groups.filter((group) => group.items.length > 0);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 'recently';
  }

  const difference = Date.now() - timestamp;

  if (difference < 60_000) {
    return 'just now';
  }

  const minutes = Math.round(difference / 60_000);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  if (days < 30) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(timestamp));
}

const notificationIcon: Record<string, React.ComponentType<{ size?: number }>> = {
  assigned_to_you: UserCheck,
  mentioned: MessageSquare,
  new_comment: MessageSquare,
  issue_reopened: AlertTriangle,
  issue_closed: CheckCheck,
  label_changed: Tag,
  pr_linked: GitPullRequest,
  review_requested: UserCheck,
  repo_sync_completed: RefreshCw,
  repo_sync_failed: XCircle,
  ai_insight_generated: Bot,
  stale_issue_warning: AlertTriangle,
  security_alert: ShieldAlert,
  verification_email_sent: MailCheck,
  password_changed: KeyRound,
  export_completed: Download,
  workspace_analytics_refreshed: Bot,
  repository_added: Plus,
  repository_removed: Trash2,
  repository_sync_failed: XCircle,
  guest_limit_warning: AlertTriangle,
  oauth_link_updated: Link2,
  session_revoked: UserX,
};

const severityTone = {
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
  success: 'border-green-600/30 bg-green-500/10 text-green-700 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-300',
  warning: 'border-amber-600/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'border-red-600/30 bg-red-500/10 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300',
  ai: 'border-cyan-600/30 bg-cyan-500/10 text-cyan-700 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200',
};

function normalizeNotification(notification: WorkspaceNotification): WorkspaceNotification | null {
  const title = sanitizeText(notification.title);
  const description = sanitizeText(notification.description);
  const timestamp = new Date(notification.timestamp);

  if (!notification.id || !title || !description || Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return {
    ...notification,
    id: sanitizeText(notification.id),
    title,
    description,
    timestamp: timestamp.toISOString(),
    href: notification.href.startsWith('http')
      ? safeExternalHref(notification.href, '/issues')
      : safeRouteHref(notification.href, '/issues'),
    repository: notification.repository ? sanitizeText(notification.repository) : undefined,
    actor: notification.actor
      ? {
          name: sanitizeText(notification.actor.name, 'GitHub'),
          avatarUrl: notification.actor.avatarUrl
            ? safeExternalHref(notification.actor.avatarUrl, '')
            : null,
        }
      : undefined,
  };
}
