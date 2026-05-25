import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

type StackProps = HTMLAttributes<HTMLElement> & {
  direction?: 'row' | 'col';
  gap?: Gap;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  as?: ElementType;
  children?: ReactNode;
};

const gapMap: Record<Gap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
  16: 'gap-16',
};

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
} as const;

export function Stack({
  direction = 'col',
  gap = 4,
  align,
  justify,
  wrap,
  as: Tag = 'div',
  className,
  children,
  style,
  ...rest
}: StackProps) {
  const inline: CSSProperties = { ...style };
  return (
    <Tag
      className={cn(
        'flex',
        direction === 'col' ? 'flex-col' : 'flex-row',
        gapMap[gap],
        align && alignMap[align],
        justify && justifyMap[justify],
        wrap && 'flex-wrap',
        className
      )}
      style={inline}
      {...rest}
    >
      {children}
    </Tag>
  );
}
