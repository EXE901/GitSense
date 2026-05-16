'use client';

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-secondary/70" />
          <div className="h-2 w-32 rounded bg-secondary/50" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-secondary/70" />
      </div>
      <div className="mb-4 h-8 w-32 rounded bg-secondary/70" />
      <div className="h-12 rounded bg-secondary/50" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
      <div className="mb-6 h-4 w-32 rounded bg-secondary/70" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-secondary/50" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonIssueRow() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <div className="h-6 w-16 rounded-full bg-secondary/70" />
            <div className="h-4 w-12 rounded bg-secondary/60" />
            <div className="h-4 w-24 rounded bg-secondary/60" />
          </div>
          <div className="mb-2 h-5 w-2/3 rounded bg-secondary/70" />
          <div className="mb-3 flex gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-4 w-20 rounded bg-secondary/60" />
            ))}
          </div>
          <div className="h-3 w-40 rounded bg-secondary/50" />
        </div>
        <div className="h-8 w-12 rounded bg-secondary/70" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-secondary/60" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-secondary/60" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-secondary/60" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonIssueRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
