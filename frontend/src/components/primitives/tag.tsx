import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type TagProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

/**
 * Tag — filter chip primitive.
 */
export function Tag({ active = false, className, children, ...rest }: TagProps) {
  return (
    <button
      type="button"
      data-active={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gs-accent-primary)]/60 sm:h-7 sm:px-2.5 sm:text-[12px]',
        active
          ? 'bg-[color:var(--gs-accent-soft)] text-[color:var(--gs-accent)] border-[color:var(--gs-accent)]/40'
          : 'bg-transparent text-[color:var(--gs-fg-1)] border-[color:var(--gs-border-default)] hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
