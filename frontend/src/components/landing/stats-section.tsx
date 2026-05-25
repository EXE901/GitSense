'use client';

import { Counter, RevealGroup } from '@/components/motion';

const STATS = [
  { label: 'Repositories ingested', to: 4280, format: (v: number) => `${Math.round(v).toLocaleString()}+` },
  { label: 'Webhook events / day', to: 1820000, format: (v: number) => `${(v / 1_000_000).toFixed(1)}M` },
  { label: 'Median query latency', to: 0.8, format: (v: number) => `${v.toFixed(1)}s`, decimals: 1 },
  { label: 'Operational uptime', to: 99.97, format: (v: number) => `${v.toFixed(2)}%`, decimals: 2 },
];

export function StatsSection() {
  return (
    <section
      className="relative border-y px-4 py-16 sm:px-6 sm:py-20"
      style={{
        borderColor: 'var(--gs-border-subtle)',
        background:
          'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 60%, transparent), color-mix(in oklch, var(--gs-bg-0) 100%, transparent))',
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        <RevealGroup stagger={100} y={18} duration={520} className="grid grid-cols-2 gap-8 sm:gap-12 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <div
                className="font-medium text-[color:var(--gs-fg-0)] tabular-nums"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1.05, letterSpacing: '-0.015em' }}
              >
                <Counter
                  to={s.to}
                  format={s.format}
                  decimals={s.decimals ?? 0}
                  duration={1400}
                />
              </div>
              <div className="mt-2 text-[12px] uppercase tracking-[0.14em] text-[color:var(--gs-fg-2)]">
                {s.label}
              </div>
            </div>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
