'use client';

import { useEffect, useRef } from 'react';

type ScrollProgressProps = {
  className?: string;
  height?: number;
};

/**
 * ScrollProgress — 2px top-of-viewport progress bar.
 * Writes to a CSS transform on each animation frame; never re-renders React tree.
 */
export function ScrollProgress({ className = '', height = 2 }: ScrollProgressProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const node = ref.current;
      if (!node) return;
      const doc = document.documentElement;
      const scrolled = window.scrollY;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const p = Math.min(1, Math.max(0, scrolled / max));
      node.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] origin-left ${className}`}
      style={{
        height,
        background: 'var(--gs-accent-primary)',
        transform: 'scaleX(0)',
        transition: 'transform 80ms linear',
        willChange: 'transform',
      }}
      ref={ref}
    />
  );
}
