'use client';

import { BarChart3, Zap, GitBranch, Bell } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Issue Velocity Analytics',
    description: 'Track resolution times, cycle metrics, and issue throughput. Detect when your team is slowing down before it becomes a problem.',
  },
  {
    icon: Zap,
    title: 'Workflow Bottleneck Detection',
    description: 'Identify stalled issues, contributor blockers, and process gaps. Surface recommended actions backed by your repository data.',
  },
  {
    icon: GitBranch,
    title: 'GitHub-Native Integration',
    description: 'Seamless sync with all your repositories. No API throttling concerns. Works with your existing workflows instantly.',
  },
  {
    icon: Bell,
    title: 'Real-Time Workspace Intelligence',
    description: 'Monitor contributor activity, issue status changes, and repository trends. Stay informed without notification overload.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="mb-10 sm:mb-14 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Engineering Operations Visibility
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Cycle time, contributor signal, and workflow bottlenecks — measured from real GitHub activity, refreshed in real time.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="p-6 sm:p-8 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-smooth hover-lift group animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
