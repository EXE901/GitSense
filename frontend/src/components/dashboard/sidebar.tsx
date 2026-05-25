'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ProductLogo } from '@/components/branding/product-logo';
import { useAppShell } from '@/components/layout/app-shell';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: GitBranch, label: 'Issues', href: '/issues' },
  { icon: BarChart3, label: 'Analytics', href: '/analytics' },
  { icon: Activity, label: 'Activity', href: '/activity' },
  { icon: TrendingUp, label: 'Trends', href: '/trends' },
  { icon: LineChart, label: 'Repositories', href: '/repositories' },
  { icon: Settings, label: 'Settings', href: '/settings' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { guestSession, logout, status, user } = useAuth();
  const { collapsed, toggle, closeMobile } = useAppShell();

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div
        className="flex h-12 items-center justify-between border-b px-3"
        style={{ borderColor: 'var(--gs-border-subtle)' }}
      >
        {collapsed ? (
          <Link
            href="/"
            onClick={closeMobile}
            aria-label="GitSense home"
            className="flex h-8 w-8 items-center justify-center rounded-md"
          >
            <ProductLogo href="" size="sm" showText={false} />
          </Link>
        ) : (
          <ProductLogo
            href="/"
            size="sm"
            showText={true}
            onClick={closeMobile}
          />
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-[color:var(--gs-fg-2)] transition-colors hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)] lg:inline-flex"
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>
      </div>

      {/* Section eyebrow */}
      {collapsed ? null : (
        <div
          className="px-3 pt-4 pb-1 text-[10.5px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          Workspace
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className="group relative flex h-8 items-center rounded-md text-[13px] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]"
                  style={{
                    color: isActive ? 'var(--gs-fg-0)' : 'var(--gs-fg-1)',
                    background: isActive ? 'var(--gs-bg-2)' : 'transparent',
                    paddingLeft: collapsed ? 8 : 10,
                    paddingRight: collapsed ? 8 : 10,
                  }}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-[2px] rounded-r"
                      style={{ background: 'var(--gs-accent-primary)' }}
                    />
                  ) : null}
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0"
                    style={{
                      color: isActive
                        ? 'var(--gs-accent-primary)'
                        : 'var(--gs-fg-2)',
                    }}
                  />
                  {collapsed ? null : (
                    <span className="ml-2.5 truncate">{item.label}</span>
                  )}
                  {!isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-md opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100"
                      style={{ background: 'var(--gs-bg-2)' }}
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Account footer */}
      <div
        className="border-t p-2"
        style={{ borderColor: 'var(--gs-border-subtle)' }}
      >
        {collapsed ? (
          status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => {
                closeMobile();
                void logout();
              }}
              aria-label="Log out"
              title="Log out"
              className="flex h-8 w-full items-center justify-center rounded-md transition-colors hover:bg-[color:var(--gs-bg-2)]"
              style={{ color: 'var(--gs-fg-2)' }}
            >
              <LogOut size={14} />
            </button>
          ) : (
            <Link
              href="/signup"
              onClick={closeMobile}
              aria-label="Save workspace"
              title="Save workspace"
              className="flex h-8 w-full items-center justify-center rounded-md transition-colors"
              style={{
                background: 'var(--gs-accent-soft)',
                color: 'var(--gs-accent-primary)',
              }}
            >
              <UserPlus size={14} />
            </Link>
          )
        ) : (
          <div className="space-y-2">
            <div
              className="rounded-md border px-2.5 py-1.5"
              style={{
                borderColor: 'var(--gs-border-subtle)',
                background: 'color-mix(in oklch, var(--gs-bg-2) 50%, transparent)',
              }}
            >
              <p className="truncate text-[12px] font-medium text-[color:var(--gs-fg-0)]">
                {status === 'authenticated' ? user?.username : 'Guest demo'}
              </p>
              <p className="truncate text-[11px] text-[color:var(--gs-fg-2)]">
                {status === 'authenticated'
                  ? user?.github_username
                    ? `@${user.github_username}`
                    : user?.email
                  : `${guestSession?.remaining_repositories ?? 0} demo syncs left`}
              </p>
            </div>
            {status === 'authenticated' ? (
              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  void logout();
                }}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] font-medium transition-colors hover:bg-[color:var(--gs-bg-2)]"
                style={{ color: 'var(--gs-fg-1)' }}
              >
                <LogOut size={14} />
                Log out
              </button>
            ) : (
              <Link
                href="/signup"
                onClick={closeMobile}
                className="flex h-8 w-full items-center gap-2 rounded-md border px-2.5 text-[13px] font-medium transition-colors"
                style={{
                  background: 'var(--gs-accent-soft)',
                  borderColor:
                    'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
                  color: 'var(--gs-accent-primary)',
                }}
              >
                <UserPlus size={14} />
                Save workspace
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
