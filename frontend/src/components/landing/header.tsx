'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProductLogo } from '@/components/branding/product-logo';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { scrollToSection, handleAnchorNavigation } from '@/lib/nav-utils';
import { useActiveSection } from '@/hooks/use-active-section';

export function LandingHeader() {
  const { status, user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const activeSection = useActiveSection(['features', 'workflow'], 100);

  // Handle hash navigation on mount
  useEffect(() => {
    handleAnchorNavigation();
  }, []);

  const handleNavClick = (sectionId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToSection(sectionId);
    setIsMobileOpen(false);
  };

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'workflow', label: 'Workflow' },
  ];

  return (
    <header className="sticky-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <ProductLogo href="/" size="sm" showText={true} />

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={handleNavClick(item.id)}
              className={`text-sm transition-colors smooth-transition ${
                activeSection === item.id
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle compact />
          {status === 'loading' ? (
            <div className="h-9 w-32 animate-pulse rounded-lg bg-card" />
          ) : status === 'authenticated' ? (
            <>
              <span className="max-w-40 truncate text-sm text-muted-foreground">
                {user?.github_username ? `@${user.github_username}` : user?.username}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Open Dashboard
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground hover:text-muted-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Connect GitHub
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileOpen((current) => !current)}
          className="sm:hidden inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground transition-smooth hover:bg-secondary/70"
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileOpen}
        >
          {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={handleNavClick(item.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition-smooth ${
                  activeSection === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="mt-2 grid gap-2 border-t border-border pt-3">
              <ThemeToggle className="justify-center" />
              {status === 'loading' ? (
                <div className="h-10 animate-pulse rounded-lg bg-card" />
              ) : status === 'authenticated' ? (
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90"
                >
                  Open Dashboard
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-secondary/70"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:opacity-90"
                  >
                    Connect GitHub
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
