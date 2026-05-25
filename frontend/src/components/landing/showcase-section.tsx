'use client';

import { useEffect, useRef } from 'react';
import { Reveal } from '@/components/motion';
import { Eyebrow } from '@/components/primitives';
import { GitPullRequest, CheckCircle2, AlertTriangle, Activity, ArrowUpRight } from 'lucide-react';

/**
 * ShowcaseSection — sticky-pinned dashboard mock.
 *
 * Scroll progress 0..1 across the outer wrapper is written to a CSS variable
 * (--gs-showcase-p) on the sticky inner container. That single variable drives
 * the card's 3D tilt, the glow intensity, the panel reveal, and the chart line
 * draw — without any Framer Motion, in a single rAF.
 */
export function ShowcaseSection() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    if (!wrap || !sticky) return;
    if (typeof window === 'undefined') return;

    let raf = 0;
    let ticking = false;
    // Cached bounds so getBoundingClientRect is not called every scroll tick
    // (this is the source of layout thrashing + Safari jitter when the URL
    // bar transitions). We refresh them only on layout-affecting events.
    let topAbs = 0;
    let totalScroll = 0;

    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      topAbs = rect.top + window.scrollY;
      // Use the visible (stable) viewport height. Prefer visualViewport when
      // available because it tracks the iOS Safari URL bar accurately.
      const vh = window.visualViewport?.height ?? window.innerHeight ?? 1;
      totalScroll = Math.max(1, rect.height - vh);
    };

    const update = () => {
      ticking = false;
      const scrolled = window.scrollY - topAbs;
      const p = Math.min(1, Math.max(0, scrolled / totalScroll));
      sticky.style.setProperty('--gs-showcase-p', p.toFixed(4));
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

    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    // visualViewport tracks the URL bar more accurately than `resize` on iOS
    window.visualViewport?.addEventListener('resize', onResize);

    // Recompute bounds when the section itself changes height (font load,
    // image lazy-load, etc.)
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, []);

  return (
    <section
      id="showcase"
      ref={wrapRef}
      className="relative h-[180vh] lg:h-[220vh]"
    >
      <div
        ref={stickyRef}
        className="sticky top-0 gs-h-stable flex items-center overflow-hidden px-4 sm:px-6"
        style={{
          ['--gs-showcase-p' as string]: '0',
        }}
      >
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Left — narrative */}
          <div>
            <Reveal y={16} duration={400}>
              <Eyebrow tone="accent" className="mb-4">Operational view</Eyebrow>
            </Reveal>
            <Reveal y={20} delay={80} duration={520}>
              <h2
                className="mb-5 text-balance font-medium tracking-[-0.015em] text-[color:var(--gs-fg-0)]"
                style={{ fontSize: 'clamp(1.875rem, 3.4vw + 0.25rem, 2.75rem)', lineHeight: 1.1 }}
              >
                Activity becomes{' '}
                <span className="text-[color:var(--gs-fg-1)]">operational intelligence.</span>
              </h2>
            </Reveal>
            <Reveal y={16} delay={160} duration={420}>
              <p className="max-w-[52ch] text-[15px] leading-[1.6] text-[color:var(--gs-fg-2)]">
                Issues, contributors, and repository signals — aggregated into one calm,
                operational surface. The same primitives you see here power the live product.
              </p>
            </Reveal>

            <Reveal y={12} delay={240} duration={400}>
              <ul className="mt-8 space-y-3 text-[13.5px] text-[color:var(--gs-fg-1)]">
                {[
                  'Cycle time and review latency, per repo and per contributor',
                  'Stale issue detection with reasoned-explanations',
                  'Workspace-wide bottleneck timeline',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={15}
                      className="mt-[3px] shrink-0"
                      style={{ color: 'var(--gs-accent-primary)' }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Right — dashboard card.
              3D tilt is applied on desktop only; mobile keeps the card flat
              so the perspective transform doesn't fight the portrait
              viewport. The progress variable still drives the inner
              illumination + reveal on both. */}
          <div
            className="relative mx-auto w-full max-w-[640px] gs-showcase-card"
          >
            {/* Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-[20px]"
              style={{
                background:
                  'radial-gradient(80% 70% at 50% 50%, color-mix(in oklch, var(--gs-accent-primary) 28%, transparent), transparent 75%)',
                filter: 'blur(48px)',
                opacity:
                  'calc(0.2 + var(--gs-showcase-p) * 0.6)',
                transition: 'opacity 120ms linear',
              }}
            />

            <div
              className="relative overflow-hidden rounded-[16px] border [box-shadow:inset_0_1px_0_oklch(1_0_0/0.05),0_40px_80px_-30px_oklch(0_0_0/0.7)]"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 96%, transparent), color-mix(in oklch, var(--gs-bg-0) 96%, transparent))',
                borderColor: 'var(--gs-border-default)',
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 border-b px-4 py-2.5"
                style={{ borderColor: 'var(--gs-border-subtle)' }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--gs-state-danger)', opacity: 0.6 }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--gs-state-warning)', opacity: 0.6 }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--gs-state-open)', opacity: 0.6 }} />
                <div
                  className="ml-3 inline-flex items-center gap-2 rounded-md border px-2 py-0.5 font-mono text-[11px]"
                  style={{
                    borderColor: 'var(--gs-border-subtle)',
                    color: 'var(--gs-fg-2)',
                  }}
                >
                  gitsense.app · / dashboard
                </div>
              </div>

              {/* Body */}
              <div className="space-y-4 p-5">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
                      Workspace · main
                    </div>
                    <div className="mt-1 text-[14px] font-medium text-[color:var(--gs-fg-0)]">
                      Operational health
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      borderColor: 'color-mix(in oklch, var(--gs-state-open) 35%, transparent)',
                      background: 'color-mix(in oklch, var(--gs-state-open) 12%, transparent)',
                      color: 'var(--gs-state-open)',
                    }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--gs-state-open)' }}
                    />
                    Live · synced 12s ago
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Open', value: '342', delta: '+12', icon: GitPullRequest },
                    { label: 'Cycle', value: '4.2d', delta: '−0.4d', icon: Activity },
                    { label: 'Stalled', value: '17', delta: '+3', icon: AlertTriangle },
                    { label: 'Merged', value: '128', delta: '+22', icon: CheckCircle2 },
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.label}
                        className="rounded-[10px] border p-3"
                        style={{
                          borderColor: 'var(--gs-border-subtle)',
                          background: 'color-mix(in oklch, var(--gs-bg-2) 70%, transparent)',
                          opacity: `calc(0.4 + var(--gs-showcase-p) * 0.6)`,
                          transition: `opacity 120ms linear, transform 200ms var(--ease-standard)`,
                          transform: `translateY(calc((1 - var(--gs-showcase-p)) * ${6 + i * 2}px))`,
                        }}
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
                          <span>{m.label}</span>
                          <Icon size={11} />
                        </div>
                        <div
                          className="mt-1.5 font-medium text-[color:var(--gs-fg-0)] tabular-nums"
                          style={{ fontSize: 22, lineHeight: 1.1 }}
                        >
                          {m.value}
                        </div>
                        <div
                          className="mt-0.5 text-[11px] font-medium"
                          style={{
                            color: m.delta.startsWith('−')
                              ? 'var(--gs-state-open)'
                              : 'var(--gs-state-warning)',
                          }}
                        >
                          {m.delta}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart + feed */}
                <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                  {/* Chart */}
                  <div
                    className="rounded-[10px] border p-4"
                    style={{
                      borderColor: 'var(--gs-border-subtle)',
                      background: 'color-mix(in oklch, var(--gs-bg-2) 50%, transparent)',
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[color:var(--gs-fg-2)]">
                      <span>Issue velocity · 14d</span>
                      <span>+18%</span>
                    </div>
                    <svg viewBox="0 0 280 110" className="w-full">
                      <defs>
                        <linearGradient id="gs-show-area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--gs-accent-primary)" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="var(--gs-accent-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* gridlines */}
                      {[20, 50, 80].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          y1={y}
                          x2={280}
                          y2={y}
                          stroke="var(--gs-border-subtle)"
                          strokeDasharray="3 4"
                        />
                      ))}
                      <path
                        d="M0 80 L20 70 L40 75 L60 60 L80 55 L100 50 L120 40 L140 45 L160 30 L180 35 L200 28 L220 22 L240 32 L260 18 L280 24"
                        fill="none"
                        stroke="var(--gs-accent-primary)"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          strokeDasharray: 400,
                          strokeDashoffset: `calc(400 - var(--gs-showcase-p) * 400)`,
                          transition: 'stroke-dashoffset 120ms linear',
                        }}
                      />
                      <path
                        d="M0 80 L20 70 L40 75 L60 60 L80 55 L100 50 L120 40 L140 45 L160 30 L180 35 L200 28 L220 22 L240 32 L260 18 L280 24 L280 110 L0 110 Z"
                        fill="url(#gs-show-area)"
                        opacity="calc(var(--gs-showcase-p))"
                        style={{ transition: 'opacity 160ms linear' }}
                      />
                    </svg>
                  </div>

                  {/* Feed */}
                  <div
                    className="rounded-[10px] border p-2.5"
                    style={{
                      borderColor: 'var(--gs-border-subtle)',
                      background: 'color-mix(in oklch, var(--gs-bg-2) 50%, transparent)',
                    }}
                  >
                    <div className="mb-2 px-1 text-[11px] text-[color:var(--gs-fg-2)]">
                      Recent activity
                    </div>
                    <ul className="space-y-1.5">
                      {[
                        { tone: 'var(--gs-state-open)', text: 'opened #482', meta: '2m' },
                        { tone: 'var(--gs-state-merged)', text: 'merged #481', meta: '5m' },
                        { tone: 'var(--gs-state-warning)', text: 'stalled #470', meta: '4d' },
                        { tone: 'var(--gs-state-closed)', text: 'closed #468', meta: '1h' },
                      ].map((row, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12px]"
                          style={{
                            background:
                              'color-mix(in oklch, var(--gs-bg-1) 90%, transparent)',
                            opacity: `calc(0.4 + var(--gs-showcase-p) * 0.6)`,
                            transform: `translateX(calc((1 - var(--gs-showcase-p)) * ${4 + i * 2}px))`,
                            transition: 'opacity 140ms linear, transform 200ms var(--ease-standard)',
                          }}
                        >
                          <span className="flex items-center gap-2 text-[color:var(--gs-fg-1)]">
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: row.tone }}
                            />
                            {row.text}
                          </span>
                          <span className="font-mono text-[10.5px] text-[color:var(--gs-fg-2)]">
                            {row.meta}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer pill */}
              <div
                className="flex items-center justify-between border-t px-4 py-2 text-[11px]"
                style={{
                  borderColor: 'var(--gs-border-subtle)',
                  color: 'var(--gs-fg-2)',
                }}
              >
                <span className="font-mono">workspace://main</span>
                <span className="inline-flex items-center gap-1 text-[color:var(--gs-accent-primary)]">
                  Live operational view <ArrowUpRight size={11} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
