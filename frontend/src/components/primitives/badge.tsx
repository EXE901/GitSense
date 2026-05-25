import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone =
  | 'neutral'
  | 'info'
  | 'open'
  | 'closed'
  | 'merged'
  | 'draft'
  | 'warning'
  | 'danger';

type Size = 'sm' | 'md';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
  children?: ReactNode;
};

const toneClasses: Record<Tone, string> = {
  neutral:
    'bg-[color:var(--gs-bg-2)] text-[color:var(--gs-fg-1)] border border-[color:var(--gs-border-default)]',
  info:
    'bg-[color:var(--gs-accent-soft)] text-[color:var(--gs-accent)] border border-[color:var(--gs-accent)]/30',
  open:
    'bg-[color:var(--gs-state-open)]/12 text-[color:var(--gs-state-open)] border border-[color:var(--gs-state-open)]/30',
  closed:
    'bg-[color:var(--gs-state-closed)]/12 text-[color:var(--gs-state-closed)] border border-[color:var(--gs-state-closed)]/30',
  merged:
    'bg-[color:var(--gs-state-merged)]/12 text-[color:var(--gs-state-merged)] border border-[color:var(--gs-state-merged)]/30',
  draft:
    'bg-[color:var(--gs-bg-2)] text-[color:var(--gs-fg-2)] border border-[color:var(--gs-border-default)]',
  warning:
    'bg-[color:var(--gs-state-warning)]/12 text-[color:var(--gs-state-warning)] border border-[color:var(--gs-state-warning)]/30',
  danger:
    'bg-[color:var(--gs-state-danger)]/12 text-[color:var(--gs-state-danger)] border border-[color:var(--gs-state-danger)]/30',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-5 px-1.5 text-[11px]',
  md: 'h-6 px-2 text-[12px]',
};

const dotColor: Record<Tone, string> = {
  neutral: 'bg-[color:var(--gs-fg-2)]',
  info: 'bg-[color:var(--gs-accent)]',
  open: 'bg-[color:var(--gs-state-open)]',
  closed: 'bg-[color:var(--gs-state-closed)]',
  merged: 'bg-[color:var(--gs-state-merged)]',
  draft: 'bg-[color:var(--gs-fg-2)]',
  warning: 'bg-[color:var(--gs-state-warning)]',
  danger: 'bg-[color:var(--gs-state-danger)]',
};

export function Badge({
  tone = 'neutral',
  size = 'sm',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium tracking-[0.01em]',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])} /> : null}
      {children}
    </span>
  );
}
