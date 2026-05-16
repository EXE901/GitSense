'use client';

import { ExternalLink, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { ProductLogo } from '@/components/branding/product-logo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-secondary/30 py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <ProductLogo href="/" size="sm" showText={true} className="mb-2" />
            <p className="text-xs text-muted-foreground">GitHub issue analytics and workspace insights.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#features" className="text-muted-foreground hover:text-foreground smooth-transition">Features</Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground smooth-transition">Dashboard</Link>
              </li>
              <li>
                <Link href="/issues" className="text-muted-foreground hover:text-foreground smooth-transition">Issues</Link>
              </li>
              <li>
                <Link href="/analytics" className="text-muted-foreground hover:text-foreground smooth-transition">Analytics</Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/activity" className="text-muted-foreground hover:text-foreground smooth-transition">Activity</Link>
              </li>
              <li>
                <Link href="/repositories" className="text-muted-foreground hover:text-foreground smooth-transition">Repositories</Link>
              </li>
              <li>
                <Link href="/trends" className="text-muted-foreground hover:text-foreground smooth-transition">Trends</Link>
              </li>
              <li>
                <Link href="/settings" className="text-muted-foreground hover:text-foreground smooth-transition">Settings</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-muted-foreground/60" aria-disabled="true">Privacy coming soon</span>
              </li>
              <li>
                <span className="text-muted-foreground/60" aria-disabled="true">Terms coming soon</span>
              </li>
              <li>
                <span className="text-muted-foreground/60" aria-disabled="true">Cookie policy coming soon</span>
              </li>
              <li>
                <Link href="/settings" className="text-muted-foreground hover:text-foreground smooth-transition">Contact settings</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© {currentYear} GitSense · Workspace insights for GitHub teams.</div>
          <div className="flex items-center gap-4">
            <Link href="/repositories" className="flex items-center gap-1 hover:text-foreground smooth-transition">
              <GitBranch size={16} />
              Repositories
            </Link>
            <span>•</span>
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground smooth-transition">
              Dashboard <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
