'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

type RouteFadeProps = {
  children: ReactNode;
  duration?: number;
  className?: string;
};

/**
 * RouteFade — fades the segment content out and back in on path change.
 * Manipulates opacity directly via a ref to avoid React state churn.
 */
export function RouteFade({ children, duration = 180, className }: RouteFadeProps) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (previous.current === null) {
      previous.current = pathname;
      node.style.opacity = '1';
      return;
    }
    if (previous.current === pathname) return;
    previous.current = pathname;
    node.style.transition = `opacity ${duration}ms var(--ease-standard)`;
    node.style.opacity = '0';
    const t = window.setTimeout(() => {
      node.style.opacity = '1';
    }, duration);
    return () => window.clearTimeout(t);
  }, [pathname, duration]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 1,
        transition: `opacity ${duration}ms var(--ease-standard)`,
      }}
    >
      {children}
    </div>
  );
}
