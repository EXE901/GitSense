'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  placeholder?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, success, placeholder, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const borderColor = error
      ? 'color-mix(in oklch, var(--gs-state-danger) 45%, transparent)'
      : success
        ? 'color-mix(in oklch, var(--gs-state-open) 45%, transparent)'
        : isFocused
          ? 'color-mix(in oklch, var(--gs-accent-primary) 50%, transparent)'
          : 'var(--gs-border-default)';

    return (
      <div className="space-y-1.5">
        <label
          className="block text-[12px] font-medium"
          style={{ color: 'var(--gs-fg-1)' }}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            {...props}
            placeholder={placeholder}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              'w-full rounded-[8px] border bg-[color:var(--gs-bg-1)] px-3 py-2 text-[13.5px] text-[color:var(--gs-fg-0)] placeholder:text-[color:var(--gs-fg-3)] transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gs-accent-primary)]/50',
              (error || success) && 'pr-9',
              className
            )}
            style={{
              borderColor,
              background: isFocused
                ? 'var(--gs-bg-2)'
                : 'var(--gs-bg-1)',
            }}
          />
          {error ? (
            <AlertCircle
              className="absolute right-3 top-1/2 -translate-y-1/2"
              size={14}
              style={{ color: 'var(--gs-state-danger)' }}
            />
          ) : null}
          {success ? (
            <CheckCircle2
              className="absolute right-3 top-1/2 -translate-y-1/2"
              size={14}
              style={{ color: 'var(--gs-state-open)' }}
            />
          ) : null}
        </div>
        {error ? (
          <p
            className="flex items-center gap-1.5 text-[11.5px]"
            style={{ color: 'var(--gs-state-danger)' }}
          >
            <AlertCircle size={11} />
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
