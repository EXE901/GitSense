'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

export function HeroSection() {
  const { status } = useAuth();
  const primaryHref = status === 'unauthenticated' ? '/signup' : '/dashboard';
  const primaryLabel = status === 'unauthenticated' ? 'Connect GitHub' : 'Open Dashboard';

  return (
    <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden flex items-center min-h-[calc(100vh-4rem)]">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs sm:text-sm text-primary mb-6 sm:mb-8 animate-fade-in-down">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Built for developers who live in GitHub
        </div>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-balance leading-tight mb-4 sm:mb-6 text-foreground animate-fade-in-up">
          Your GitHub Workflow, Operationalized
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground text-balance mb-8 sm:mb-10 max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Real-time issue velocity, contributor signal, and workflow bottlenecks — surfaced directly from your repositories. Engineering visibility without leaving GitHub.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-10 sm:mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Link
            href={primaryHref}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold hover-lift transition-smooth text-sm sm:text-base"
          >
            {primaryLabel}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/dashboard?demo=1"
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 border border-border bg-card hover:bg-secondary/50 text-foreground rounded-lg font-semibold transition-smooth hover-scale-up text-sm sm:text-base"
          >
            Explore Live Demo
          </Link>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>GitHub-native · Operational analytics in real time</span>
        </div>
      </div>
    </section>
  );
}
