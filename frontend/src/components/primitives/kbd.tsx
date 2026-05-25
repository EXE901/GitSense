import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type KbdProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
};

export function Kbd({ className, children, ...rest }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-[4px] border border-[color:var(--gs-border-default)] bg-[color:var(--gs-bg-2)] px-1.5 text-[11px] font-medium leading-none text-[color:var(--gs-fg-1)] font-mono',
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
