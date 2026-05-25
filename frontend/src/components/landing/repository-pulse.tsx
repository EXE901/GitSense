'use client';

import { useEffect, useRef } from 'react';

/**
 * RepositoryPulseSvg — stylized commit-graph that draws itself on mount.
 *
 * - Two branches diverge and rejoin (mimics a feature-branch merge).
 * - Each node pulses on a staggered loop.
 * - The connecting paths animate via `stroke-dashoffset` once on mount.
 * - All transforms are GPU-cheap; honors prefers-reduced-motion via globals.css.
 */
export function RepositoryPulseSvg() {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Compute each path's length and set its dasharray so stroke-draw works.
    const paths = node.querySelectorAll<SVGPathElement>('path[data-draw]');
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.setProperty('--gs-stroke-length', String(len));
      p.style.setProperty('--gs-stroke-duration', `${1400 + Math.random() * 400}ms`);
    });
  }, []);

  return (
    <div className="relative aspect-[5/4] w-full">
      {/* Outer card surface */}
      <div
        className="absolute inset-0 rounded-[16px] border [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 92%, transparent), color-mix(in oklch, var(--gs-bg-0) 92%, transparent))',
          borderColor: 'var(--gs-border-default)',
          boxShadow:
            '0 24px 64px -32px oklch(0 0 0 / 0.5), 0 0 0 1px color-mix(in oklch, var(--gs-accent-primary) 8%, transparent), 0 0 80px -20px color-mix(in oklch, var(--gs-accent-primary) 35%, transparent)',
        }}
      />

      {/* Faux header bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 rounded-t-[16px] border-b px-4 py-3"
        style={{ borderColor: 'var(--gs-border-subtle)' }}>
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--gs-state-danger)', opacity: 0.7 }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--gs-state-warning)', opacity: 0.7 }} />
        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--gs-state-open)', opacity: 0.7 }} />
        <div className="ml-3 inline-flex items-center gap-2 text-[11px] font-mono text-[color:var(--gs-fg-2)]">
          <span>git log --graph</span>
          <span className="opacity-60">·</span>
          <span className="opacity-60">main</span>
        </div>
      </div>

      {/* The graph itself */}
      <svg
        ref={ref}
        viewBox="0 0 500 400"
        className="absolute inset-0 h-full w-full p-3 pt-10"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gs-branch-main" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gs-accent-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--gs-accent-primary)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="gs-branch-feature" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="gs-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--gs-accent-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--gs-accent-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Main branch (horizontal) */}
        <path
          d="M 30 200 L 470 200"
          stroke="url(#gs-branch-main)"
          strokeWidth="2"
          fill="none"
          className="gs-stroke-draw"
          data-draw
        />

        {/* Feature branch (arc up + down) */}
        <path
          d="M 130 200 C 160 160, 220 110, 280 110 L 360 110 C 400 110, 430 160, 460 200"
          stroke="url(#gs-branch-feature)"
          strokeWidth="2"
          fill="none"
          className="gs-stroke-draw"
          data-draw
          style={{ animationDelay: '300ms' }}
        />

        {/* Secondary feature branch (arc down) */}
        <path
          d="M 200 200 C 220 240, 250 280, 300 290 L 370 290 C 410 290, 430 250, 450 220"
          stroke="url(#gs-branch-feature)"
          strokeWidth="1.5"
          strokeOpacity="0.6"
          fill="none"
          className="gs-stroke-draw"
          data-draw
          style={{ animationDelay: '550ms' }}
        />

        {/* Glows behind key nodes */}
        {[
          [30, 200, 18],
          [130, 200, 22],
          [280, 110, 22],
          [360, 110, 22],
          [460, 200, 26],
          [300, 290, 18],
        ].map(([x, y, r], i) => (
          <circle
            key={`g-${i}`}
            cx={x}
            cy={y}
            r={r}
            fill="url(#gs-node-glow)"
            className="gs-constellation-pulse"
            style={{ animationDelay: `${i * 0.4}s`, animationDuration: '3.6s' }}
          />
        ))}

        {/* Main-branch commit nodes */}
        {[30, 130, 200, 280, 360, 460].map((x, i) => (
          <g key={`m-${i}`}>
            <circle
              cx={x}
              cy={200}
              r={5.5}
              fill="var(--gs-bg-1)"
              stroke="var(--gs-accent-primary)"
              strokeWidth={2}
            />
            <circle
              cx={x}
              cy={200}
              r={2.2}
              fill="var(--gs-accent-primary)"
              className="gs-constellation-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          </g>
        ))}

        {/* Upper feature commits */}
        {[280, 360].map((x, i) => (
          <g key={`u-${i}`}>
            <circle
              cx={x}
              cy={110}
              r={5}
              fill="var(--gs-bg-1)"
              stroke="var(--gs-accent-cyan)"
              strokeWidth={1.75}
            />
            <circle
              cx={x}
              cy={110}
              r={1.8}
              fill="var(--gs-accent-cyan)"
              className="gs-constellation-pulse"
              style={{ animationDelay: `${0.6 + i * 0.4}s` }}
            />
          </g>
        ))}

        {/* Lower feature commits */}
        {[300, 370].map((x, i) => (
          <g key={`d-${i}`}>
            <circle
              cx={x}
              cy={290}
              r={4.5}
              fill="var(--gs-bg-1)"
              stroke="var(--gs-accent-cyan)"
              strokeOpacity={0.7}
              strokeWidth={1.5}
            />
            <circle
              cx={x}
              cy={290}
              r={1.6}
              fill="var(--gs-accent-cyan)"
              fillOpacity={0.8}
              className="gs-constellation-pulse"
              style={{ animationDelay: `${0.9 + i * 0.4}s` }}
            />
          </g>
        ))}

        {/* Branch labels */}
        <g fontFamily="var(--font-mono, monospace)" fontSize="10">
          <text x="475" y="204" fill="var(--gs-fg-1)" textAnchor="end" opacity="0.7">
            main
          </text>
          <text x="475" y="114" fill="var(--gs-accent-cyan)" textAnchor="end" opacity="0.85">
            feat/insights
          </text>
          <text x="475" y="294" fill="var(--gs-accent-cyan)" textAnchor="end" opacity="0.7">
            fix/sync-jobs
          </text>
        </g>

        {/* Floating data pills */}
        <g fontFamily="var(--font-sans, sans-serif)" fontSize="10">
          <g transform="translate(36, 230)">
            <rect
              width="120"
              height="22"
              rx="6"
              fill="color-mix(in oklch, var(--gs-bg-2) 90%, transparent)"
              stroke="var(--gs-border-default)"
            />
            <circle cx="10" cy="11" r="3" fill="var(--gs-state-open)" />
            <text x="20" y="15" fill="var(--gs-fg-1)">
              opened · #482
            </text>
          </g>
          <g transform="translate(168, 80)">
            <rect
              width="124"
              height="22"
              rx="6"
              fill="color-mix(in oklch, var(--gs-bg-2) 90%, transparent)"
              stroke="var(--gs-border-default)"
            />
            <circle cx="10" cy="11" r="3" fill="var(--gs-state-merged)" />
            <text x="20" y="15" fill="var(--gs-fg-1)">
              merged · 2h ago
            </text>
          </g>
          <g transform="translate(310, 314)">
            <rect
              width="116"
              height="22"
              rx="6"
              fill="color-mix(in oklch, var(--gs-bg-2) 90%, transparent)"
              stroke="var(--gs-border-default)"
            />
            <circle cx="10" cy="11" r="3" fill="var(--gs-state-warning)" />
            <text x="20" y="15" fill="var(--gs-fg-1)">
              stalled · 4d
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
