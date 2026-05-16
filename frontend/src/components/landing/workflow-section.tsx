'use client';

import { ArrowRight } from 'lucide-react';

export function WorkflowSection() {
  return (
    <section id="workflow" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-10 sm:mb-14 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            From GitHub to Operational Insight
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Connect, analyze, operationalize. Four steps, no friction.
          </p>
        </div>

        {/* Workflow steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { number: '1', title: 'Connect GitHub', description: 'Authorize GitSense to access your repositories. One-click setup.' },
            { number: '2', title: 'Real-Time Sync', description: 'Live data ingestion from GitHub. Issues, PRs, contributors, activity.' },
            { number: '3', title: 'Analytics & Metrics', description: 'Automatic calculation of velocity, cycle time, stale issues, bottlenecks.' },
            { number: '4', title: 'Operational Dashboard', description: 'Unified workspace with dashboards, trends, insights, and recommendations.' },
          ].map((step, index) => (
            <div key={index} className="relative">
              {/* Card */}
              <div className="p-4 sm:p-6 rounded-lg border border-border bg-card hover:border-primary/30 smooth-transition">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mb-3 sm:mb-4 flex-shrink-0">
                  {step.number}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps */}
              {index < 3 && (
                <div className="hidden md:flex absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 text-muted-foreground/30">
                  <ArrowRight size={24} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
