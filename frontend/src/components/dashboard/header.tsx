'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ExportPanel } from '@/components/topbar/export-panel';
import { NotificationsCenter } from '@/components/topbar/notifications-center';
import { ShareWorkspacePanel } from '@/components/topbar/share-workspace-panel';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const routeLabels: Record<string, string> = {
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
  const [statusMessage, setStatusMessage] = useState('GitSense Live');
  const title = routeLabels[pathname] ?? 'GitSense';
  const ownership = useMemo(
    () => ({
      token,
      guestSessionId: guestSession?.guest_session_id ?? null,
    }),
    [guestSession?.guest_session_id, token]
  );

  function showTemporaryStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage('GitSense Live'), 1800);
  }

  function handleRefresh() {
    window.dispatchEvent(new Event('gitsense:refresh-issues'));
    router.refresh();
    showTemporaryStatus('Refreshing');
  }

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pl-14 pr-4 sm:px-6 py-3 sm:py-4 gap-2 sm:gap-6 pt-4 sm:pt-4 safe-area-inset-top">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight truncate">{title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">GitHub issue analytics and workspace signals</p>
        </div>

        {/* Right side - compact on mobile */}
        <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
          {/* Status indicator - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/30 flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-soft"></div>
            <span className="text-xs text-green-600/70">{statusMessage}</span>
          </div>

          {/* Last updated - hidden on mobile */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="text-xs sm:text-sm text-foreground">just now</p>
          </div>

          {/* Action buttons - mobile optimized */}
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-foreground transition-smooth hover-scale-up border border-transparent hover:border-border/50 flex-shrink-0"
            aria-label="Refresh issue data"
            title="Refresh issue data"
          >
            <RefreshCw size={16} />
          </button>

          <ExportPanel ownership={ownership} route={pathname} onStatus={showTemporaryStatus} />
          <NotificationsCenter ownership={ownership} route={pathname} onStatus={showTemporaryStatus} />
          <ShareWorkspacePanel ownership={ownership} route={pathname} onStatus={showTemporaryStatus} />
          <ThemeToggle compact />
        </div>
      </div>
    </header>
  );
}
