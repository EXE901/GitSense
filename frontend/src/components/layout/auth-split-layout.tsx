'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Activity, GitPullRequest, Radar } from 'lucide-react';
import { AtmosphericLayer } from '@/components/landing/atmospheric-layer';
import { ProductLogo } from '@/components/branding/product-logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Reveal, RevealGroup } from '@/components/motion';
import { Eyebrow } from '@/components/primitives';

interface AuthSplitLayoutProps {
  children: ReactNode;
}

const BRAND_PILLARS = [
  {
    icon: Radar,
    label: 'Signal',
    detail: 'Surface stalled work and on-call escalation patterns.',
  },
  {
    icon: Activity,
    label: 'Velocity',
    detail: 'Cycle time and review latency per repo and contributor.',
  },
  {
    icon: GitPullRequest,
    label: 'Visibility',
    detail: 'One operational view across every repository.',
  },
] as const;

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--gs-bg-0)', color: 'var(--gs-fg-0)' }}
    >
      {/* Page-wide atmospheric layer (muted intensity) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <AtmosphericLayer
          intensity="muted"
          showConstellation
          cursorReactive={false}
        />
      </div>

      {/* Top bar — logo (mobile) + theme toggle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="pointer-events-auto lg:invisible">
          <ProductLogo href="/" size="sm" showText={true} />
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle compact />
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Brand panel (desktop only) */}
        <aside
          className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between border-r p-12"
          style={{
            borderColor: 'var(--gs-border-subtle)',
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 75%, transparent), color-mix(in oklch, var(--gs-bg-0) 95%, transparent))',
          }}
        >
          <Reveal y={12} duration={420}>
            <ProductLogo href="/" size="md" showText={true} />
          </Reveal>

          <div className="max-w-[460px] space-y-10">
            <div>
              <Reveal y={12} duration={400}>
                <Eyebrow tone="accent" className="mb-4">
                  GitHub operational intelligence
                </Eyebrow>
              </Reveal>
              <Reveal y={24} delay={120} duration={520}>
                <h2
                  className="text-balance font-medium tracking-[-0.015em]"
                  style={{
                    color: 'var(--gs-fg-0)',
                    fontSize: 'clamp(1.875rem, 2.4vw + 0.5rem, 2.5rem)',
                    lineHeight: 1.1,
                  }}
                >
                  Your GitHub workflow,{' '}
                  <span style={{ color: 'var(--gs-fg-1)' }}>
                    measured from the source of truth.
                  </span>
                </h2>
              </Reveal>
              <Reveal y={16} delay={220} duration={400}>
                <p
                  className="mt-4 max-w-[44ch] text-[14px] leading-[1.65]"
                  style={{ color: 'var(--gs-fg-2)' }}
                >
                  Cycle time, contributor signal, and workflow bottlenecks —
                  surfaced directly from the repositories you already trust.
                </p>
              </Reveal>
            </div>

            <RevealGroup stagger={100} y={14} duration={420} startDelay={320} className="space-y-3">
              {BRAND_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.label}
                    className="flex items-start gap-3 rounded-[10px] border p-3"
                    style={{
                      background:
                        'color-mix(in oklch, var(--gs-bg-1) 85%, transparent)',
                      borderColor: 'var(--gs-border-subtle)',
                    }}
                  >
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                      style={{
                        background: 'var(--gs-accent-soft)',
                        borderColor:
                          'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
                        color: 'var(--gs-accent-primary)',
                      }}
                    >
                      <Icon size={15} strokeWidth={1.75} />
                    </span>
                    <div>
                      <p
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--gs-fg-0)' }}
                      >
                        {pillar.label}
                      </p>
                      <p
                        className="mt-0.5 text-[12px] leading-[1.5]"
                        style={{ color: 'var(--gs-fg-2)' }}
                      >
                        {pillar.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RevealGroup>
          </div>

          <Reveal y={8} delay={520} duration={400}>
            <div
              className="flex items-center justify-between text-[11px]"
              style={{ color: 'var(--gs-fg-2)' }}
            >
              <span>
                © {new Date().getFullYear()} GitSense · GitHub-native
              </span>
              <Link
                href="/"
                className="transition-colors hover:text-[color:var(--gs-fg-0)]"
              >
                Marketing site →
              </Link>
            </div>
          </Reveal>
        </aside>

        {/* Form column */}
        <main className="relative flex w-full items-center justify-center px-4 py-16 sm:px-6 sm:py-20 lg:w-[48%] lg:px-12 xl:w-[45%]">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
