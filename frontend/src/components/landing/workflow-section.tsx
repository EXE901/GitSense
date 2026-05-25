'use client';

import { useEffect, useRef } from 'react';
import { GitBranch, Activity, Database, Lightbulb, Workflow } from 'lucide-react';
import { Reveal, RevealGroup } from '@/components/motion';
import { Eyebrow } from '@/components/primitives';

const STEPS = [
  {
    icon: GitBranch,
    label: 'Connect',
    title: 'Authorize GitSense on the repositories you operate.',
    body: 'Read-only OAuth, scoped exactly to what we analyze. No code is mirrored — only metadata.',
  },
  {
    icon: Activity,
    label: 'Ingest',
    title: 'Live webhooks + scheduled syncs feed the workspace.',
    body: 'Issues, pull requests, reviews, and contributor events stream in continuously, normalized into a single timeline.',
  },
  {
    icon: Database,
    label: 'Analyze',
    title: 'Cycle time, throughput, and bottlenecks are computed in place.',
    body: 'We compute operational metrics inside Postgres so queries stay sub-second even as repositories grow.',
  },
  {
    icon: Lightbulb,
    label: 'Surface',
    title: 'Insights, anomalies, and recommended actions appear in one operational view.',
    body: 'Stale issue clusters, review-latency spikes, and contributor blockers are surfaced with context — not as a feed.',
  },
  {
    icon: Workflow,
    label: 'Operate',
    title: 'Triage from the dashboard or jump straight into GitHub.',
    body: 'Every insight links back to the source. GitSense is a lens — your workflow remains in GitHub.',
  },
] as const;

const NODE_X = [80, 280, 480, 680, 880];
const NODE_Y = 60;

export function WorkflowSection() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  // Scroll listener runs ONLY on desktop (lg+) where the SVG scrub diagram
  // exists. On mobile we render a stacked list with its own reveals, so no
  // sticky scrub work is wasted.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    let raf = 0;
    let ticking = false;
    let topAbs = 0;
    let totalScroll = 0;

    const measure = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      topAbs = rect.top + window.scrollY;
      const vh = window.visualViewport?.height ?? window.innerHeight ?? 1;
      totalScroll = Math.max(1, rect.height - vh);
    };

    const update = () => {
      ticking = false;
      const sticky = stickyRef.current;
      if (!sticky) return;
      const scrolled = window.scrollY - topAbs;
      const p = Math.min(1, Math.max(0, scrolled / totalScroll));
      sticky.style.setProperty('--gs-workflow-p', p.toFixed(4));
      const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      sticky.dataset.activeStep = String(idx);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    let attached = false;
    const attach = () => {
      if (attached) return;
      measure();
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('orientationchange', onResize, { passive: true });
      window.visualViewport?.addEventListener('resize', onResize);
      attached = true;
    };
    const detach = () => {
      if (!attached) return;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      attached = false;
      // Pin the diagram to its final visual state when scrub is detached
      // (mobile) so it never looks half-drawn behind the stacked list.
      const sticky = stickyRef.current;
      if (sticky) {
        sticky.style.setProperty('--gs-workflow-p', '1');
        sticky.dataset.activeStep = String(STEPS.length - 1);
      }
    };

    const evaluate = () => {
      if (desktopQuery.matches) attach();
      else detach();
    };

    evaluate();
    desktopQuery.addEventListener('change', evaluate);

    return () => {
      detach();
      desktopQuery.removeEventListener('change', evaluate);
    };
  }, []);

  return (
    <section
      id="workflow"
      ref={wrapRef}
      className="relative h-auto lg:h-[320vh]"
    >
      <div
        ref={stickyRef}
        className="lg:sticky lg:top-0 lg:gs-h-stable flex flex-col justify-center px-4 sm:px-6 py-16 lg:py-0"
        style={{ ['--gs-workflow-p' as string]: '0' }}
        data-active-step="0"
      >
        <div className="mx-auto w-full max-w-[1200px]">
          {/* Header */}
          <div className="mb-10 lg:mb-12 max-w-[640px]">
            <Reveal y={16} duration={400}>
              <Eyebrow tone="accent" className="mb-4">Workflow</Eyebrow>
            </Reveal>
            <Reveal y={20} delay={80} duration={500}>
              <h2
                className="text-balance font-medium tracking-[-0.015em] text-[color:var(--gs-fg-0)]"
                style={{
                  fontSize: 'clamp(1.875rem, 3.4vw + 0.25rem, 2.75rem)',
                  lineHeight: 1.1,
                }}
              >
                From GitHub events to{' '}
                <span className="text-[color:var(--gs-fg-1)]">operational insight, in five steps.</span>
              </h2>
            </Reveal>
          </div>

          {/* Desktop scrub diagram */}
          <div className="relative hidden lg:block">
            <svg viewBox="0 0 960 120" className="w-full" aria-hidden="true">
              <line
                x1={NODE_X[0]}
                y1={NODE_Y}
                x2={NODE_X[NODE_X.length - 1]}
                y2={NODE_Y}
                stroke="var(--gs-border-default)"
                strokeWidth={1}
              />
              <line
                x1={NODE_X[0]}
                y1={NODE_Y}
                x2={NODE_X[NODE_X.length - 1]}
                y2={NODE_Y}
                stroke="var(--gs-accent-primary)"
                strokeWidth={2}
                strokeLinecap="round"
                style={{
                  strokeDasharray: NODE_X[NODE_X.length - 1] - NODE_X[0],
                  strokeDashoffset:
                    'calc((1 - var(--gs-workflow-p)) * ' +
                    (NODE_X[NODE_X.length - 1] - NODE_X[0]) +
                    ')',
                  transition: 'stroke-dashoffset 120ms linear',
                }}
              />
              <circle
                r={5}
                fill="var(--gs-accent-primary)"
                style={{
                  filter: 'drop-shadow(0 0 8px var(--gs-accent-primary))',
                  transform:
                    'translateX(calc(' +
                    NODE_X[0] +
                    'px + var(--gs-workflow-p) * ' +
                    (NODE_X[NODE_X.length - 1] - NODE_X[0]) +
                    'px))',
                  transformBox: 'view-box',
                  transition: 'transform 120ms linear',
                }}
                cy={NODE_Y}
              />
              {STEPS.map((_, i) => (
                <g key={i} data-node-step={i}>
                  <circle
                    cx={NODE_X[i]}
                    cy={NODE_Y}
                    className="gs-workflow-node-circle"
                    fill="var(--gs-bg-1)"
                  />
                  <text
                    x={NODE_X[i]}
                    y={NODE_Y + 38}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="var(--font-mono, monospace)"
                    letterSpacing="0.14em"
                    className="gs-workflow-node-label"
                  >
                    {STEPS[i].label.toUpperCase()}
                  </text>
                </g>
              ))}
            </svg>

            {/* Step copy (CSS-driven crossfade based on data-active-step) */}
            <div className="relative mt-14 min-h-[140px]">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    data-copy-step={i}
                    className="gs-workflow-copy absolute inset-0 grid grid-cols-[auto_1fr] gap-5"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-md border"
                      style={{
                        background: 'var(--gs-accent-soft)',
                        borderColor:
                          'color-mix(in oklch, var(--gs-accent-primary) 35%, transparent)',
                        color: 'var(--gs-accent-primary)',
                      }}
                    >
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="max-w-[640px]">
                      <h3
                        className="text-[20px] font-medium text-[color:var(--gs-fg-0)] tracking-[-0.01em]"
                        style={{ lineHeight: 1.25 }}
                      >
                        {s.title}
                      </h3>
                      <p className="mt-2 text-[14px] leading-[1.6] text-[color:var(--gs-fg-2)]">
                        {s.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile / tablet — stacked steps, reveal-staggered on scroll-in */}
          <RevealGroup
            stagger={90}
            y={20}
            duration={420}
            threshold={0.08}
            className="space-y-4 lg:hidden"
          >
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr] gap-4 rounded-[12px] border p-4"
                  style={{
                    background: 'color-mix(in oklch, var(--gs-bg-1) 92%, transparent)',
                    borderColor: 'var(--gs-border-default)',
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                    style={{
                      background: 'var(--gs-accent-soft)',
                      borderColor:
                        'color-mix(in oklch, var(--gs-accent-primary) 35%, transparent)',
                      color: 'var(--gs-accent-primary)',
                    }}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-[color:var(--gs-accent-primary)]">
                      0{i + 1} · {s.label}
                    </div>
                    <h3 className="mt-1 text-[15px] font-medium text-[color:var(--gs-fg-0)] tracking-[-0.01em]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-[1.55] text-[color:var(--gs-fg-2)]">
                      {s.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
