import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'panel' | 'interactive';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
};

const padMap = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const;

const variantClasses: Record<Variant, string> = {
  default:
    'bg-[color:var(--gs-bg-1)] border border-[color:var(--gs-border-default)] rounded-[12px] [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]',
  panel:
    'bg-[color:var(--gs-bg-1)] border border-[color:var(--gs-border-default)] rounded-[12px] [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]',
  interactive:
    'bg-[color:var(--gs-bg-1)] border border-[color:var(--gs-border-default)] rounded-[12px] [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] hover:bg-[color:var(--gs-bg-2)] hover:border-[color:var(--gs-border-strong)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', header, footer, className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cn(variantClasses[variant], className)} {...rest}>
      {header ? (
        <div className="px-4 pt-4 pb-3 border-b border-[color:var(--gs-border-subtle)]">{header}</div>
      ) : null}
      <div className={cn(header || footer ? padMap[padding === 'none' ? 'md' : padding] : padMap[padding])}>
        {children}
      </div>
      {footer ? (
        <div className="px-4 py-3 border-t border-[color:var(--gs-border-subtle)]">{footer}</div>
      ) : null}
    </div>
  );
});

type PanelHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function PanelHeader({ title, description, action, className }: PanelHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-medium text-[color:var(--gs-fg-0)] truncate">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-[12px] text-[color:var(--gs-fg-2)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
