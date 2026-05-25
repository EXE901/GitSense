import { cn } from '@/lib/cn';

type DividerProps = {
  tone?: 'subtle' | 'default';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

export function Divider({ tone = 'default', orientation = 'horizontal', className }: DividerProps) {
  const colorClass =
    tone === 'subtle'
      ? 'bg-[color:var(--gs-border-subtle)]'
      : 'bg-[color:var(--gs-border-default)]';
  const sizeClass = orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full';
  return <span role="separator" aria-hidden="true" className={cn(sizeClass, colorClass, className)} />;
}
