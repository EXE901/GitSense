'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { MagneticTarget, Reveal, RevealGroup, WordReveal } from '@/components/motion';
import { Button, Eyebrow } from '@/components/primitives';
import { RepositoryPulseSvg } from '@/components/landing/repository-pulse';

export function HeroSection() {
  const { status } = useAuth();
  const primaryHref = status === 'unauthenticated' ? '/signup' : '/dashboard';
  const primaryLabel = status === 'unauthenticated' ? 'Connect GitHub' : 'Open Dashboard';

  return (
    <section
      id="hero"
      className="relative isolate flex items-center overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28"
      style={{ minHeight: 'calc(100svh - 64px)' }}
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Left — copy column */}
        <div className="relative z-10 flex flex-col items-start">
          <Reveal y={12} duration={320}>
            <Eyebrow tone="accent" className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--gs-accent)]/30 bg-[color:var(--gs-accent-soft)] px-3 py-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--gs-accent-primary)', boxShadow: '0 0 12px var(--gs-accent-primary)' }}
              />
              GitHub-native operational intelligence
            </Eyebrow>
          </Reveal>

          <h1
            className="mb-6 max-w-[640px] text-balance font-medium tracking-[-0.015em] text-[color:var(--gs-fg-0)]"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw + 0.5rem, 4rem)',
              lineHeight: 1.05,
            }}
          >
            <WordReveal
              as="span"
              text="Your GitHub workflow,"
              stagger={42}
              y={28}
              duration={520}
              startDelay={360}
            />
            <br />
            <WordReveal
              as="span"
              text="operationalized in real time."
              stagger={42}
              y={28}
              duration={520}
              startDelay={760}
              className="text-[color:var(--gs-fg-1)]"
            />
          </h1>

          <Reveal y={16} delay={1100} duration={320}>
            <p className="mb-9 max-w-[56ch] text-[16px] leading-[1.55] text-[color:var(--gs-fg-1)] sm:text-[17px]">
              Issue velocity, contributor signal, and workflow bottlenecks — measured
              directly from your repositories. Engineering visibility without leaving
              the data you already trust.
            </p>
          </Reveal>

          <RevealGroup
            stagger={80}
            y={12}
            duration={320}
            startDelay={1320}
            className="mb-12 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
          >
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
          </RevealGroup>

          <Reveal y={8} delay={1600} duration={320}>
            <div className="flex items-center gap-2 text-[12px] text-[color:var(--gs-fg-2)]">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Free during preview · GitHub OAuth · No CC required</span>
            </div>
          </Reveal>
        </div>

        {/* Right — repository pulse visual */}
        <div className="relative">
          <Reveal y={32} delay={1100} duration={720} threshold={0.05}>
            <div className="relative mx-auto w-full max-w-[560px]">
              <RepositoryPulseSvg />
            </div>
          </Reveal>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <Reveal y={6} delay={2000} duration={400}>
          <div className="flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--gs-fg-2)]">
            <span>Scroll</span>
            <ChevronDown
              size={14}
              className="animate-bounce"
              style={{ animationDuration: '1.6s' }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
