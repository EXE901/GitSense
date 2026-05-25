import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Level = 0 | 1 | 2 | 3;

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  level?: Level;
  as?: ElementType;
  border?: boolean;
  inset?: boolean;
  children?: ReactNode;
};

const bgByLevel: Record<Level, string> = {
  0: 'bg-[color:var(--gs-bg-0)]',
  1: 'bg-[color:var(--gs-bg-1)]',
  2: 'bg-[color:var(--gs-bg-2)]',
  3: 'bg-[color:var(--gs-bg-3)]',
};

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { level = 1, as: Tag = 'div', border = true, inset = false, className, children, ...rest },
  ref
) {
  return (
    <Tag
      ref={ref as never}
      className={cn(
        bgByLevel[level],
        border && 'border border-[color:var(--gs-border-default)]',
        inset && '[box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
});
