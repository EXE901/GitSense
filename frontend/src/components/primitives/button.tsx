'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  glow?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-[8px] transition-[background-color,box-shadow,border-color,color,transform] ease-[var(--ease-standard)] duration-[var(--dur-fast)] select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gs-accent-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--gs-bg-0)] disabled:opacity-50 disabled:pointer-events-none';

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
};

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[color:var(--gs-accent-primary)] text-white hover:bg-[color:var(--gs-accent-primary-hover)] active:bg-[color:var(--gs-accent-primary-pressed)]',
  secondary:
    'bg-[color:var(--gs-bg-2)] text-[color:var(--gs-fg-0)] border border-[color:var(--gs-border-default)] hover:bg-[color:var(--gs-bg-3)]',
  outline:
    'bg-transparent text-[color:var(--gs-fg-0)] border border-[color:var(--gs-border-default)] hover:bg-[color:var(--gs-bg-2)]',
  ghost:
    'bg-transparent text-[color:var(--gs-fg-1)] hover:bg-[color:var(--gs-bg-2)] hover:text-[color:var(--gs-fg-0)]',
  danger:
    'bg-[color:var(--gs-state-danger)] text-white hover:opacity-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', glow = false, loading = false, iconLeft, iconRight, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      data-glow={glow ? 'true' : undefined}
      className={cn(
        base,
        sizeClasses[size],
        variantClasses[variant],
        glow && 'shadow-[var(--shadow-glow)]',
        className
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
        />
      ) : iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
