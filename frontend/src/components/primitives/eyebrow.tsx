import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EyebrowProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'accent';
  children: ReactNode;
};

export function Eyebrow({ tone = 'default', className, children, ...rest }: EyebrowProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]',
        tone === 'accent'
          ? 'text-[color:var(--gs-accent)]'
          : 'text-[color:var(--gs-fg-2)]',
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
