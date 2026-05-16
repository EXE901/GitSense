'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

export function CTASection() {
  const { status } = useAuth();
  const primaryHref = status === 'unauthenticated' ? '/signup' : '/dashboard';
  const primaryLabel = status === 'unauthenticated' ? 'Connect GitHub' : 'Open Dashboard';

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 -top-40">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6 text-balance">
          Operationalize Your GitHub Workspace
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
          Connect a repository and start surfacing issue velocity, contributor signals, and workflow bottlenecks in real time.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover-lift transition-smooth text-sm sm:text-base"
          >
            {primaryLabel}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/dashboard?demo=1"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border border-border bg-card hover:bg-secondary/50 text-foreground rounded-lg font-semibold transition-smooth text-sm sm:text-base"
          >
            Explore Live Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
