'use client';

import { useState, forwardRef } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  placeholder?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, success, placeholder, className = '', ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="space-y-2.5 animate-fade-in-up">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="relative group">
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
            className={`w-full px-4 py-2.5 rounded-xl border bg-card/80 text-foreground placeholder:text-muted-foreground/50 shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 ${
              error
                ? 'border-destructive/40 focus:ring-destructive/40 focus:border-destructive hover:border-destructive/40'
                : success
                ? 'border-green-500/40 focus:ring-green-500/40 focus:border-green-500 hover:border-green-500/40'
                : isFocused
                ? 'border-primary/60 focus:ring-primary/40 bg-card'
                : 'border-border hover:border-primary/30'
            } ${className}`}
          />
          {error && (
            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive/60 transition-opacity duration-300" />
          )}
          {success && (
            <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 transition-opacity duration-300" />
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive/70 flex items-center gap-1.5 animate-fade-in-up">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
