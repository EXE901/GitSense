'use client';

import type { ReactNode } from 'react';
import { Reveal } from '@/components/motion';

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full">
      <Reveal y={20} duration={520}>
        <div
          className="relative rounded-[16px] border p-7 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.05),0_24px_64px_-32px_oklch(0_0_0/0.45)]"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 95%, transparent), color-mix(in oklch, var(--gs-bg-1) 80%, transparent))',
            borderColor: 'var(--gs-border-default)',
          }}
        >
          {/* Faint top accent border */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in oklch, var(--gs-accent-primary) 60%, transparent), transparent)',
              opacity: 0.7,
            }}
          />

          <div className="space-y-7">
            <div className="text-center space-y-2">
              <h1
                className="text-[22px] font-medium tracking-[-0.01em]"
                style={{ color: 'var(--gs-fg-0)' }}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: 'var(--gs-fg-2)' }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="space-y-5">{children}</div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
