'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { ProductLogo } from '@/components/branding/product-logo';
import { useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/primitives';
import { useActiveSection } from '@/hooks/use-active-section';
import { handleAnchorNavigation, scrollToSection } from '@/lib/nav-utils';

const NAV_ITEMS = [
  { id: 'features', label: 'Features' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'workflow', label: 'Workflow' },
] as const;

export function LandingHeader() {
  const { status, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeSection = useActiveSection(NAV_ITEMS.map((n) => n.id), 100);

  useEffect(() => {
    handleAnchorNavigation();
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (sectionId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection(sectionId);
    setIsMobileOpen(false);
  };

  return (
    <header
      data-scrolled={scrolled ? 'true' : undefined}
      className="fixed inset-x-0 top-0 z-50 transition-[height,backdrop-filter,background-color,border-color] duration-[var(--dur-base)] ease-[var(--ease-standard)]"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-0) 92%, transparent), color-mix(in oklch, var(--gs-bg-0) 70%, transparent))',
        borderBottom: scrolled
          ? '1px solid var(--gs-border-subtle)'
          : '1px solid transparent',
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 transition-[height] duration-[var(--dur-base)] ease-[var(--ease-standard)]"
        style={{ height: scrolled ? 56 : 64 }}
      >
        <ProductLogo href="/" size="sm" showText={true} />

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={handleNavClick(item.id)}
                className="relative h-9 rounded-md px-3 text-[13px] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)]"
                style={{
                  color: active
                    ? 'var(--gs-fg-0)'
                    : 'var(--gs-fg-2)',
                }}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 -bottom-px h-px origin-center transition-transform duration-[var(--dur-base)] ease-[var(--ease-emphasized)]"
                  style={{
                    background: 'var(--gs-accent-primary)',
                    transform: active ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </button>
            );
          })}
        </nav>

        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle compact />
          {status === 'loading' ? (
            <div className="h-9 w-32 animate-pulse rounded-md bg-[color:var(--gs-bg-2)]" />
          ) : status === 'authenticated' ? (
            <>
              <span className="max-w-40 truncate text-[12px] text-[color:var(--gs-fg-2)]">
                {user?.github_username ? `@${user.github_username}` : user?.username}
              </span>
              <Link href="/dashboard">
                <Button variant="primary" size="sm" iconRight={<ArrowRight size={14} />}>
                  Open Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm" iconRight={<ArrowRight size={14} />}>
                  Connect GitHub
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((v) => !v)}
          className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--gs-border-default)] bg-[color:var(--gs-bg-1)] text-[color:var(--gs-fg-0)] transition-colors hover:bg-[color:var(--gs-bg-2)]"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {isMobileOpen ? (
        <div className="sm:hidden border-t border-[color:var(--gs-border-subtle)] bg-[color:var(--gs-bg-0)]/95 backdrop-blur-md">
          <nav className="mx-auto flex max-w-[1200px] flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleNavClick(item.id)}
                  className="rounded-md px-3 py-2 text-left text-[13px] transition-colors"
                  style={{
                    background: active ? 'var(--gs-accent-soft)' : undefined,
                    color: active ? 'var(--gs-accent)' : 'var(--gs-fg-1)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="mt-2 grid gap-2 border-t border-[color:var(--gs-border-subtle)] pt-3">
              <ThemeToggle className="justify-center" />
              {status === 'loading' ? (
                <div className="h-10 animate-pulse rounded-md bg-[color:var(--gs-bg-2)]" />
              ) : status === 'authenticated' ? (
                <Link href="/dashboard" onClick={() => setIsMobileOpen(false)}>
                  <Button variant="primary" size="md" className="w-full" iconRight={<ArrowRight size={15} />}>
                    Open Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="secondary" size="md" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setIsMobileOpen(false)}>
                    <Button variant="primary" size="md" className="w-full" iconRight={<ArrowRight size={15} />}>
                      Connect GitHub
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
