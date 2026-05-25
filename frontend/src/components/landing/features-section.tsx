'use client';

import { Activity, GitPullRequest, Radar } from 'lucide-react';
import { Reveal, RevealGroup } from '@/components/motion';
import { Eyebrow } from '@/components/primitives';

const PILLARS = [
  {
    number: '01',
    title: 'Signal',
    icon: Radar,
    body: 'Surface the work that matters — stalled issues, blocked PRs, and on-call escalation patterns — instead of every webhook event.',
    note: 'Without signal, dashboards become noise. We rank by operational impact, not creation time.',
  },
  {
    number: '02',
    title: 'Velocity',
    icon: Activity,
    body: 'Measure cycle time, time-to-first-response, and review latency per repo and per contributor. Track them over weeks, not days.',
    note: 'Without velocity context, perceived speed and actual throughput drift apart.',
  },
  {
    number: '03',
    title: 'Visibility',
    icon: GitPullRequest,
    body: 'A single operational view across all your repositories. Workflow bottlenecks, contributor activity, and review health in one place.',
    note: 'Without visibility, leadership relies on anecdotes. With it, decisions follow evidence.',
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8"
    >
      <div className="relative mx-auto max-w-[1200px]">
        {/* Section header */}
        <div className="mb-14 sm:mb-20 max-w-[640px]">
          <Reveal y={16} duration={420}>
            <Eyebrow tone="accent" className="mb-4">Pillars</Eyebrow>
          </Reveal>
          <Reveal y={24} delay={80} duration={520}>
            <h2
              className="text-balance font-medium tracking-[-0.015em] text-[color:var(--gs-fg-0)]"
              style={{
                fontSize: 'clamp(1.875rem, 3.6vw + 0.25rem, 3rem)',
                lineHeight: 1.08,
              }}
            >
              Engineering operations,{' '}
              <span className="text-[color:var(--gs-fg-1)]">measured from the source of truth.</span>
            </h2>
          </Reveal>
          <Reveal y={16} delay={160} duration={400}>
            <p className="mt-5 max-w-[64ch] text-[15px] leading-[1.6] text-[color:var(--gs-fg-2)] sm:text-[16px]">
              GitSense reads directly from GitHub and translates raw activity into three
              operational lenses your team can act on, without ever leaving the workflow.
            </p>
          </Reveal>
        </div>

        {/* Pillars grid with vertical accent rail */}
        <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {/* Vertical rail (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 hidden h-full lg:block"
            aria-hidden="true"
          >
            <div
              className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px"
              style={{
                background:
                  'linear-gradient(180deg, transparent, color-mix(in oklch, var(--gs-accent-primary) 60%, transparent), transparent)',
              }}
            />
          </div>

          <RevealGroup stagger={120} y={20} duration={520} className="contents">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.number}
                  className="ambient-card group relative flex flex-col rounded-[14px] border p-6 transition-colors duration-[var(--dur-base)] ease-[var(--ease-standard)] sm:p-8"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 92%, transparent), color-mix(in oklch, var(--gs-bg-1) 70%, transparent))',
                    borderColor: 'var(--gs-border-default)',
                    boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.04)',
                  }}
                >
                  {/* Hover glow */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-[var(--dur-base)] ease-[var(--ease-standard)] group-hover:opacity-100"
                    style={{
                      background:
                        'radial-gradient(80% 60% at 50% 0%, color-mix(in oklch, var(--gs-accent-primary) 12%, transparent), transparent 70%)',
                    }}
                  />

                  <div className="relative">
                    <div className="mb-6 flex items-center justify-between">
                      <span
                        className="font-mono text-[12px] tracking-[0.18em]"
                        style={{ color: 'var(--gs-accent-primary)' }}
                      >
                        {pillar.number}
                      </span>
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border"
                        style={{
                          background: 'var(--gs-accent-soft)',
                          borderColor: 'color-mix(in oklch, var(--gs-accent-primary) 35%, transparent)',
                          color: 'var(--gs-accent-primary)',
                        }}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                    </div>

                    <h3
                      className="mb-3 text-[24px] font-medium tracking-[-0.01em] text-[color:var(--gs-fg-0)]"
                      style={{ lineHeight: 1.2 }}
                    >
                      {pillar.title}
                    </h3>
                    <p className="mb-6 max-w-[40ch] text-[14px] leading-[1.55] text-[color:var(--gs-fg-1)]">
                      {pillar.body}
                    </p>

                    <div className="border-t pt-4" style={{ borderColor: 'var(--gs-border-subtle)' }}>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
                        Keep in mind
                      </p>
                      <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[color:var(--gs-fg-2)]">
                        {pillar.note}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
