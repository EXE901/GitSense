'use client';

const stats = [
  { label: 'Real-Time Updates', value: 'Live' },
  { label: 'GitHub Integration', value: 'Native' },
  { label: 'Query Performance', value: '<1s' },
];

export function StatsSection() {
  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-y border-border bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2 sm:mb-3 font-mono">
                {stat.value}
              </div>
              <div className="text-base sm:text-lg text-muted-foreground tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
