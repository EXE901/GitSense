'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export function PremiumButton({
  children,
  isLoading = false,
  variant = 'primary',
  fullWidth = true,
  className = '',
  disabled,
  ...props
}: PremiumButtonProps) {
  const baseClasses = `
    relative inline-flex items-center justify-center gap-2
    font-semibold rounded-xl transition-all duration-300
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-primary to-primary/90 text-primary-foreground
      hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02]
      active:scale-[0.98]
      focus:ring-primary/50
    `,
    secondary: `
      bg-secondary/60 text-foreground hover:bg-secondary/80
      border border-border hover:border-primary/30
      hover:shadow-md active:scale-[0.98]
      focus:ring-secondary/50
    `,
    outline: `
      border border-primary/30 text-foreground
      hover:bg-primary/10 hover:border-primary/50
      active:scale-[0.98]
      focus:ring-primary/50
    `,
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
        px-4 py-3
      `}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>{typeof children === 'string' ? 'Loading...' : children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
