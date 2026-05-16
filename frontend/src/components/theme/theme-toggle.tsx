'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';

type ThemeToggleProps = {
  compact?: boolean;
  className?: string;
};

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = mounted ? theme === 'dark' : true;

  const baseClass = `group inline-flex items-center gap-2 rounded-lg border border-border bg-card/80 text-muted-foreground shadow-sm transition-smooth hover:border-primary/35 hover:bg-secondary/70 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 ${
    compact ? 'p-2' : 'px-3 py-2'
  } ${className}`;

  return (
    <button
      type="button"
      onClick={mounted ? toggleTheme : undefined}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      suppressHydrationWarning
      className={baseClass}
    >
      <span className="relative h-4 w-4 overflow-hidden" suppressHydrationWarning>
        <Sun
          size={16}
          aria-hidden="true"
          className={`absolute inset-0 transition-smooth ${
            mounted && !isDark ? 'translate-y-0 rotate-0 opacity-100' : 'translate-y-5 rotate-90 opacity-0'
          }`}
        />
        <Moon
          size={16}
          aria-hidden="true"
          className={`absolute inset-0 transition-smooth ${
            mounted && isDark ? 'translate-y-0 rotate-0 opacity-100' : '-translate-y-5 -rotate-90 opacity-0'
          }`}
        />
      </span>
      {!compact && (
        <span className="text-xs font-semibold" suppressHydrationWarning>
          {mounted ? (isDark ? 'Dark' : 'Light') : 'Theme'}
        </span>
      )}
    </button>
  );
}
