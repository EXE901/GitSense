'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ExportPanel } from '@/components/topbar/export-panel';
import { NotificationsCenter } from '@/components/topbar/notifications-center';
import { ShareWorkspacePanel } from '@/components/topbar/share-workspace-panel';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useAppShell } from '@/components/layout/app-shell';
import { Kbd } from '@/components/primitives';

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Workspace',
  '/issues': 'Issues',
  '/analytics': 'Analytics',
  '/activity': 'Activity',
  '/repositories': 'Repositories',
  '/trends': 'Trends',
  '/settings': 'Settings',
};

const ROUTE_LABELS_LONG: Record<string, string> = {
  '/dashboard': 'Workspace Overview',
  '/issues': 'Issue Feed',
  '/analytics': 'Analytics & Trends',
  '/activity': 'Activity',
  '/repositories': 'Repositories',
  '/trends': 'Trends',
  '/settings': 'Settings',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { guestSession, token } = useAuth();
  const { toggleMobile } = useAppShell();
  const [statusMessage, setStatusMessage] = useState('Live · synced');
  // Lazy init: resolved once on first render; SSR returns false.
  const [isMac] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    return /mac/i.test(navigator.platform);
  });

  const shortTitle = ROUTE_LABELS[pathname] ?? 'GitSense';
  const longTitle = ROUTE_LABELS_LONG[pathname] ?? 'GitSense';

  const ownership = useMemo(
    () => ({
      token,
      guestSessionId: guestSession?.guest_session_id ?? null,
    }),
    [guestSession?.guest_session_id, token]
  );

  function showTemporaryStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage('Live · synced'), 1800);
  }

  function handleRefresh() {
    window.dispatchEvent(new Event('gitsense:refresh-issues'));
    router.refresh();
    showTemporaryStatus('Refreshing…');
  }

  return (
    <div className="flex h-12 items-center gap-2 px-2 sm:gap-3 sm:px-5">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={toggleMobile}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[color:var(--gs-fg-1)] transition-colors hover:bg-[color:var(--gs-bg-2)] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={17} />
      </button>

      {/* Page title — short on mobile, long from sm+ */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[13px] font-medium text-[color:var(--gs-fg-0)]">
          <span className="sm:hidden">{shortTitle}</span>
          <span className="hidden sm:inline">{longTitle}</span>
        </h1>
      </div>

      {/* Search hint (md+) */}
      <button
        type="button"
        className="hidden h-8 min-w-[200px] items-center gap-2 rounded-md border px-2.5 text-[12px] text-[color:var(--gs-fg-2)] transition-colors hover:bg-[color:var(--gs-bg-2)] md:inline-flex"
        style={{
          background: 'var(--gs-bg-1)',
          borderColor: 'var(--gs-border-default)',
        }}
        aria-label="Search workspace (coming soon)"
        disabled
      >
        <Search size={13} />
        <span>Search workspace</span>
        <span className="ml-auto flex items-center gap-0.5">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      {/* Live status — full pill from sm+, just a dot on mobile */}
      <div
        className="hidden items-center gap-1.5 rounded-full border px-2 py-0.5 sm:inline-flex"
        style={{
          background: 'color-mix(in oklch, var(--gs-state-open) 10%, transparent)',
          borderColor:
            'color-mix(in oklch, var(--gs-state-open) 30%, transparent)',
        }}
        aria-label={statusMessage}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'var(--gs-state-open)' }}
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: 'var(--gs-state-open)' }}
        >
          {statusMessage}
        </span>
      </div>
      {/* Mobile-only compact live dot */}
      <span
        className="inline-flex h-9 w-3 shrink-0 items-center justify-center sm:hidden"
        aria-label={statusMessage}
        title={statusMessage}
      >
        <span
          className="block h-1.5 w-1.5 rounded-full"
          style={{
            background: 'var(--gs-state-open)',
            boxShadow: '0 0 8px var(--gs-state-open)',
          }}
        />
      </span>

      {/* Action cluster — Refresh + Notifications + Theme are always visible.
          Export + Share are hidden on small viewports to prevent crowding. */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh"
          title="Refresh"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[color:var(--gs-fg-1)] transition-colors hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]"
        >
          <RefreshCw size={15} />
        </button>
        <span className="hidden sm:inline-flex">
          <ExportPanel
            ownership={ownership}
            route={pathname}
            onStatus={showTemporaryStatus}
          />
        </span>
        <NotificationsCenter
          ownership={ownership}
          route={pathname}
          onStatus={showTemporaryStatus}
        />
        <span className="hidden sm:inline-flex">
          <ShareWorkspacePanel
            ownership={ownership}
            route={pathname}
            onStatus={showTemporaryStatus}
          />
        </span>
        <ThemeToggle compact />
      </div>
    </div>
  );
}
