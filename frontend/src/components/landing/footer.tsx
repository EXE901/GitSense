'use client';

import Link from 'next/link';
import { ProductLogo } from '@/components/branding/product-logo';
import { ExternalLink, Star } from 'lucide-react';

const GITHUB_REPO_URL = 'https://github.com/gitsense/gitsense';
const GITHUB_PROFILE_URL = 'https://github.com/gitsense';

function GitHubIcon({ size = 18 }: { size?: number }) {
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

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
          <div className="md:col-span-5 space-y-4">
            <ProductLogo href="/" size="sm" showText={true} />
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              GitHub operations intelligence — issue velocity, contributor signal, and workflow visibility for engineering teams.
            </p>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-smooth hover:border-primary/40 hover:bg-secondary/70"
            >
              <Star size={14} className="text-amber-400" aria-hidden="true" />
              Star GitSense on GitHub
              <ExternalLink size={12} className="text-muted-foreground" aria-hidden="true" />
            </a>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-semibold text-foreground mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#workflow" className="text-muted-foreground hover:text-foreground transition-colors">Workflow</Link></li>
              <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link href="/analytics" className="text-muted-foreground hover:text-foreground transition-colors">Analytics</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-semibold text-foreground mb-3 text-sm">Workspace</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/activity" className="text-muted-foreground hover:text-foreground transition-colors">Activity</Link></li>
              <li><Link href="/repositories" className="text-muted-foreground hover:text-foreground transition-colors">Repositories</Link></li>
              <li><Link href="/trends" className="text-muted-foreground hover:text-foreground transition-colors">Trends</Link></li>
              <li><Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">Settings</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-semibold text-foreground mb-3 text-sm">Open Source</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Repository
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href={GITHUB_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub profile
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_REPO_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report an issue
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">
            © {currentYear} GitSense · Built for developers who live in GitHub.
          </p>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/60 text-muted-foreground transition-smooth hover:border-primary/40 hover:text-foreground"
              aria-label="GitSense GitHub profile"
              title="GitSense GitHub profile"
            >
              <GitHubIcon size={16} />
            </a>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition-smooth hover:border-primary/40 hover:text-foreground"
              aria-label="View GitSense repository"
              title="View GitSense repository"
            >
              <Star size={13} className="text-amber-400" aria-hidden="true" />
              Star repo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
