'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  GitBranch,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ProductLogo } from '@/components/branding/product-logo';

export function Sidebar() {
  const pathname = usePathname();
  const { guestSession, logout, status, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: GitBranch, label: 'Issues', href: '/issues' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Activity, label: 'Activity', href: '/activity' },
    { icon: TrendingUp, label: 'Trends', href: '/trends' },
    { icon: LineChart, label: 'Repositories', href: '/repositories' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-3 left-4 z-50 lg:hidden bg-card p-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors safe-area-inset-top safe-area-inset-left"
        aria-label={isMobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col smooth-transition z-40 lg:z-30 overflow-y-auto safe-area-inset-left safe-area-inset-top safe-area-inset-bottom lg:sticky lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-4 sm:p-6 border-b border-sidebar-border flex-shrink-0">
          <ProductLogo href="/" size="sm" showText={true} onClick={() => setIsMobileOpen(false)} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg smooth-transition group flex-shrink-0 ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-lg shadow-primary/20'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 border border-transparent'
                }`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 sm:p-4">
          <div className="mb-3 min-w-0 rounded-lg border border-sidebar-border bg-sidebar-accent/20 px-3 py-2">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {status === 'authenticated' ? user?.username : 'Guest demo'}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {status === 'authenticated'
                ? user?.github_username ? `GitHub @${user.github_username}` : user?.email
                : `${guestSession?.remaining_repositories ?? 0} demo syncs remaining`}
            </p>
          </div>
          {status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => {
                setIsMobileOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-smooth hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
            >
              <LogOut size={17} />
              Log out
            </button>
          ) : (
            <Link
              href="/signup"
              onClick={() => setIsMobileOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition-smooth hover:bg-primary/15"
            >
              <UserPlus size={17} />
              Save workspace
            </Link>
          )}
        </div>
      </aside>

      {/* Sidebar spacer */}
      <div className="hidden w-72 flex-shrink-0 lg:block" />
    </>
  );
}
