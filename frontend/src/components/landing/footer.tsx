'use client';

import Link from 'next/link';
import { ExternalLink, Star } from 'lucide-react';
import { ProductLogo } from '@/components/branding/product-logo';

const GITHUB_REPO_URL = 'https://github.com/EXE901/GitSense';
const GITHUB_PROFILE_URL = 'https://github.com/EXE901';

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V21" />
    </svg>
  );
}

const COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#showcase', label: 'Showcase' },
      { href: '#workflow', label: 'Workflow' },
      { href: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    heading: 'Workspace',
    links: [
      { href: '/analytics', label: 'Analytics' },
      { href: '/activity', label: 'Activity' },
      { href: '/repositories', label: 'Repositories' },
      { href: '/settings', label: 'Settings' },
    ],
  },
];

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer
      className="border-t"
      style={{
        borderColor: 'var(--gs-border-subtle)',
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 50%, transparent), var(--gs-bg-0))',
      }}
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5 space-y-4">
          <ProductLogo href="/" size="sm" showText={true} />
          <p className="max-w-[36ch] text-[13.5px] leading-[1.6] text-[color:var(--gs-fg-2)]">
            GitHub-native operational intelligence — issue velocity, contributor signal, and workflow visibility for engineering teams.
          </p>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-medium text-[color:var(--gs-fg-1)] transition-colors hover:bg-[color:var(--gs-bg-2)]"
            style={{
              borderColor: 'var(--gs-border-default)',
              background: 'color-mix(in oklch, var(--gs-bg-1) 80%, transparent)',
            }}
          >
            <Star size={13} style={{ color: 'var(--gs-state-warning)' }} aria-hidden="true" />
            Star GitSense on GitHub
            <ExternalLink size={11} style={{ color: 'var(--gs-fg-2)' }} aria-hidden="true" />
          </a>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading} className="md:col-span-2">
            <h4 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
              {col.heading}
            </h4>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="md:col-span-3">
          <h4 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
            Open source
          </h4>
          <ul className="space-y-2">
            <li>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)]"
              >
                Repository
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href={GITHUB_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)]"
              >
                Maintainer profile
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href={`${GITHUB_REPO_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)]"
              >
                Report an issue
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div
        className="border-t"
        style={{ borderColor: 'var(--gs-border-subtle)' }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-5 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-[12px] text-[color:var(--gs-fg-2)]">
            © {currentYear} GitSense · Built for developers who live in GitHub.
          </p>
          <div className="flex items-center gap-2">
            <a
              href={GITHUB_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)] hover:bg-[color:var(--gs-bg-2)]"
              style={{ borderColor: 'var(--gs-border-default)' }}
              aria-label="GitSense GitHub profile"
            >
              <GitHubIcon size={14} />
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--gs-fg-1)] transition-colors hover:text-[color:var(--gs-fg-0)] hover:bg-[color:var(--gs-bg-2)]"
              style={{ borderColor: 'var(--gs-border-default)' }}
              aria-label="View GitSense repository"
            >
              <Star size={12} style={{ color: 'var(--gs-state-warning)' }} aria-hidden="true" />
              Star repo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
