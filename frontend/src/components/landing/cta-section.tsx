'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { MagneticTarget, Reveal } from '@/components/motion';
import { Button, Eyebrow } from '@/components/primitives';

export function CTASection() {
  const { status } = useAuth();
  const primaryHref = status === 'unauthenticated' ? '/signup' : '/dashboard';
  const primaryLabel = status === 'unauthenticated' ? 'Connect GitHub' : 'Open Dashboard';

  return (
    <section className="relative isolate overflow-hidden px-4 py-28 sm:py-36">
      {/* Atmospheric peak */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklch, var(--gs-accent-primary) 35%, transparent) 0%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: 0.4,
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--gs-accent-primary) 50%, transparent), transparent)',
            opacity: 0.6,
          }}
        />
      </div>

      <div className="mx-auto max-w-[820px] text-center">
        <Reveal y={14} duration={400}>
          <Eyebrow tone="accent" className="mb-6 inline-flex">
            Ready when you are
          </Eyebrow>
        </Reveal>

        <Reveal y={24} delay={80} duration={520}>
          <h2
            className="text-balance font-medium tracking-[-0.015em] text-[color:var(--gs-fg-0)]"
            style={{
              fontSize: 'clamp(2rem, 4vw + 0.5rem, 3.25rem)',
              lineHeight: 1.08,
            }}
          >
            Operationalize your GitHub workspace.
          </h2>
        </Reveal>

        <Reveal y={18} delay={160} duration={440}>
          <p className="mx-auto mt-6 max-w-[58ch] text-[15px] leading-[1.65] text-[color:var(--gs-fg-2)] sm:text-[16px]">
            Connect a repository and start surfacing issue velocity, contributor signal,
            and workflow bottlenecks in real time. No infrastructure to maintain.
          </p>
        </Reveal>

        <Reveal y={12} delay={240} duration={400}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticTarget strength={6} radius={80} className="w-full sm:w-auto">
              <Link href={primaryHref} className="contents">
                <Button
                  variant="primary"
                  size="lg"
                  glow
                  iconRight={<ArrowRight size={16} />}
                  className="w-full sm:w-auto"
                >
                  {primaryLabel}
                </Button>
              </Link>
            </MagneticTarget>
            <Link href="/dashboard?demo=1" className="contents">
              <Button variant="outline" size="lg" className="ambient-card w-full sm:w-auto">
                Explore Live Demo
              </Button>
            </Link>
          </div>
        </Reveal>

        <Reveal y={8} delay={320} duration={360}>
          <p className="mt-6 text-[12px] text-[color:var(--gs-fg-2)]">
            GitHub OAuth · Read-only · Free during preview
          </p>
        </Reveal>
      </div>
    </section>
  );
}
