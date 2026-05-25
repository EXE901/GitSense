'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer
      className="mt-12 border-t"
      style={{ borderColor: 'var(--gs-border-subtle)' }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-3 px-4 py-4 text-[13px] sm:flex-row sm:items-center sm:gap-2 sm:px-6 sm:text-[12px] lg:px-8"
        style={{ color: 'var(--gs-fg-2)' }}
      >
        <p className="leading-snug">© {currentYear} GitSense — operational intelligence for GitHub workspaces.</p>
        <div className="-mx-2 flex items-center gap-1">
          <Link
            href="/repositories"
            className="rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]"
          >
            Repositories
          </Link>
          <span aria-hidden="true" className="opacity-60">·</span>
          <Link
            href="/settings"
            className="rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]"
          >
            Settings
          </Link>
          <span aria-hidden="true" className="opacity-60">·</span>
          <Link
            href="/"
            className="rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]"
          >
            Marketing
          </Link>
        </div>
      </div>
    </footer>
  );
}
