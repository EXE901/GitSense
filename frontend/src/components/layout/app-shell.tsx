'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

type AppShellProps = {
  sidebar: ReactNode;
  topbar: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

const STORAGE_KEY = 'gs.sidebar.collapsed';

/**
 * Sidebar collapse state shared via DOM dataset so the sidebar component can
 * read it without prop drilling. Persisted to localStorage.
 *
 * Width tokens:
 *   - expanded: 240px
 *   - collapsed: 56px
 */
function readInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AppShell({ sidebar, topbar, footer, children }: AppShellProps) {
  // Lazy initializer is evaluated once during render; on the server it returns
  // `false` (no window). After hydration the persisted value is restored by
  // the effect below — which only fires if the stored value differs.
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
    document.documentElement.dataset.sidebarCollapsed = collapsed ? '1' : '0';
  }, [collapsed]);

  // Body scroll-lock when the mobile sheet is open + Escape closes it.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mobileOpen) {
      const previousOverflow = root.style.overflow;
      root.style.overflow = 'hidden';
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => {
        root.style.overflow = previousOverflow;
        window.removeEventListener('keydown', onKey);
      };
    }
    return undefined;
  }, [mobileOpen]);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <AppShellContext.Provider
      value={{ collapsed, toggle, mobileOpen, toggleMobile, closeMobile }}
    >
      <div
        className="min-h-screen"
        style={{
          background: 'var(--gs-bg-0)',
          color: 'var(--gs-fg-0)',
          ['--gs-sidebar-w' as string]: collapsed ? '56px' : '240px',
        }}
      >
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:px-3 focus:py-2 focus:text-[12.5px] focus:font-medium focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--gs-bg-1)',
            color: 'var(--gs-fg-0)',
            border: '1px solid var(--gs-border-default)',
          }}
        >
          Skip to main content
        </a>
        <div
          className="grid min-h-screen grid-cols-[1fr] lg:[grid-template-columns:var(--gs-sidebar-w)_1fr]"
          style={{
            transition: 'grid-template-columns var(--dur-base) var(--ease-standard)',
          }}
        >
          {/* Sidebar slot (desktop). On mobile, sidebar renders as overlay sheet. */}
          <aside
            className="hidden lg:block sticky top-0 h-screen border-r"
            style={{
              background: 'var(--gs-bg-1)',
              borderColor: 'var(--gs-border-subtle)',
            }}
          >
            {sidebar}
          </aside>

          <div className="flex min-w-0 flex-col">
            {/* Topbar */}
            <header
              className="sticky top-0 z-30 border-b"
              style={{
                background: 'color-mix(in oklch, var(--gs-bg-0) 92%, transparent)',
                borderColor: 'var(--gs-border-subtle)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {topbar}
            </header>

            {/* Main scroll area */}
            <main id="app-main" className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-[1440px] px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
                {children}
              </div>
              {footer ? footer : null}
            </main>
          </div>
        </div>

        {/* Mobile sidebar sheet */}
        <div className="lg:hidden">
          {mobileOpen ? (
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="fixed inset-0 z-40 cursor-default"
              style={{ background: 'color-mix(in oklch, var(--gs-bg-0) 55%, transparent)' }}
            />
          ) : null}
          <aside
            data-open={mobileOpen ? 'true' : undefined}
            className="fixed inset-y-0 left-0 z-50 w-[260px] border-r shadow-2xl transition-transform duration-[var(--dur-base)] ease-[var(--ease-emphasized)]"
            style={{
              background: 'var(--gs-bg-1)',
              borderColor: 'var(--gs-border-subtle)',
              transform: mobileOpen ? 'translate3d(0,0,0)' : 'translate3d(-100%,0,0)',
            }}
          >
            {sidebar}
          </aside>
        </div>
      </div>
    </AppShellContext.Provider>
  );
}

// --- Context ----------------------------------------------------------------

import { createContext, useContext } from 'react';

type AppShellState = {
  collapsed: boolean;
  toggle: () => void;
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const AppShellContext = createContext<AppShellState | null>(null);

export function useAppShell(): AppShellState {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    return {
      collapsed: false,
      toggle: () => undefined,
      mobileOpen: false,
      toggleMobile: () => undefined,
      closeMobile: () => undefined,
    };
  }
  return ctx;
}
