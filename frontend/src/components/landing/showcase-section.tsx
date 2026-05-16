'use client';

import { useEffect, useRef, useState } from 'react';

export function ShowcaseSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-background via-secondary/20 to-background">
      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 sm:w-[28rem] h-72 sm:h-[28rem] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-10 sm:mb-14 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Activity Becomes Operational Intelligence
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Issues, contributors, and repository signals — aggregated into a single operational view.
          </p>
        </div>

        {/* Dashboard preview container */}
        <div className={`relative mx-auto max-w-5xl transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 scale-95'}`}>
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 smooth-transition" />

          {/* Dashboard mock frame */}
          <div className="relative bg-card border border-border/50 rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-secondary/50 border-b border-border/50 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 ml-3">
                <div className="w-64 h-2 bg-border/30 rounded text-xs" />
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 sm:p-8 bg-background/60">
              {/* Header */}
              <div className="mb-6 sm:mb-8 flex items-center justify-between">
                <div className="space-y-2">
                  <div className={`h-4 w-48 bg-border/30 rounded transition-all duration-700 delay-300 ${isVisible ? 'bg-foreground/10' : ''}`} />
                  <div className={`h-2 w-32 bg-border/20 rounded transition-all duration-700 delay-500 ${isVisible ? 'bg-muted-foreground/20' : ''}`} />
                </div>
                <div className="flex gap-2">
                  <div className={`h-8 w-20 bg-border/30 rounded transition-all duration-700 delay-[700ms] ${isVisible ? 'bg-primary/20' : ''}`} />
                  <div className={`h-8 w-20 bg-border/20 rounded transition-all duration-700 delay-[900ms] ${isVisible ? 'bg-border/30' : ''}`} />
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`p-3 sm:p-4 rounded-lg border border-border/30 bg-secondary/50 transition-all duration-700 ${
                      isVisible
                        ? 'border-primary/30 bg-primary/5'
                        : ''
                    }`}
                    style={{ transitionDelay: `${600 + i * 100}ms` }}
                  >
                    <div className={`h-3 w-12 bg-border/30 rounded mb-2 transition-all duration-700 ${isVisible ? 'bg-foreground/30' : ''}`} />
                    <div className={`h-6 w-16 bg-border/30 rounded transition-all duration-700 ${isVisible ? 'bg-primary/40' : ''}`} />
                  </div>
                ))}
              </div>

              {/* Charts section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Chart 1 */}
                <div className={`p-4 sm:p-6 rounded-lg border border-border/30 bg-secondary/50 transition-all duration-1000 ${isVisible ? 'border-primary/20 bg-primary/5' : ''}`}>
                  <div className={`h-3 w-20 bg-border/30 rounded mb-4 transition-all duration-700 ${isVisible ? 'bg-foreground/20' : ''}`} />
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-12 rounded bg-gradient-to-r from-primary/20 to-primary/5 transition-all duration-700 ${
                          isVisible ? 'from-primary/40 to-primary/10' : ''
                        }`}
                        style={{ transitionDelay: `${800 + i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Chart 2 */}
                <div className={`p-4 sm:p-6 rounded-lg border border-border/30 bg-secondary/50 transition-all duration-1000 ${isVisible ? 'border-accent/20 bg-accent/5' : ''}`}>
                  <div className={`h-3 w-20 bg-border/30 rounded mb-4 transition-all duration-700 ${isVisible ? 'bg-foreground/20' : ''}`} />
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`h-12 rounded bg-gradient-to-r from-accent/20 to-accent/5 transition-all duration-700 ${
                          isVisible ? 'from-accent/40 to-accent/10' : ''
                        }`}
                        style={{ transitionDelay: `${800 + i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className={`absolute -bottom-8 -left-8 w-40 p-4 bg-card border border-border rounded-lg shadow-lg transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="h-3 w-24 bg-border/30 rounded mb-2" />
            <div className="h-2 w-20 bg-border/20 rounded" />
          </div>

          <div className={`absolute -top-4 -right-4 w-44 p-4 bg-card border border-border rounded-lg shadow-lg transition-all duration-1000 ${
            isVisible ? 'opacity-100 -translate-y-0' : 'opacity-0 translate-y-4'
          }`} style={{ transitionDelay: '600ms' }}>
            <div className="h-3 w-28 bg-border/30 rounded mb-2" />
            <div className="h-2 w-24 bg-border/20 rounded" />
          </div>
        </div>
      </div>
    </section>
  );
}
