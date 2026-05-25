'use client';

import { Shimmer } from '@/components/motion';

const cardBase =
  'rounded-[12px] border p-4 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]';
const cardStyle = {
  background: 'var(--gs-bg-1)',
  borderColor: 'var(--gs-border-default)',
} as const;

export function SkeletonCard() {
  return (
    <div className={cardBase} style={cardStyle}>
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Shimmer height={10} width={96} />
          <Shimmer height={8} width={128} />
        </div>
        <Shimmer height={32} width={32} rounded="md" />
      </div>
      <Shimmer height={28} width={120} className="mb-4" />
      <Shimmer height={24} />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className={cardBase} style={cardStyle}>
      <Shimmer height={14} width={128} className="mb-5" />
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} height={12} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonIssueRow() {
  return (
    <div
      className="rounded-[10px] border px-3 py-2.5"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor: 'var(--gs-border-subtle)',
      }}
    >
      <div className="flex items-center gap-3">
        <Shimmer height={16} width={56} rounded="full" />
        <Shimmer height={10} width={36} />
        <div className="flex-1">
          <Shimmer height={12} width="60%" />
        </div>
        <Shimmer height={10} width={56} />
        <Shimmer height={20} width={28} rounded="md" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Shimmer height={12} width={120} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Shimmer height={12} width={120} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Shimmer height={12} width={120} />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonIssueRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
