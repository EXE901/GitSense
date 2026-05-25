'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from './use-reduced-motion';

type CounterProps = {
  from?: number;
  to: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  decimals?: number;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function defaultFormat(value: number, decimals: number) {
  return decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString();
}

/**
 * Counter — animated numeric ramp. Writes directly to DOM via ref; no state.
 */
export function Counter({
  from = 0,
  to,
  duration = 1200,
  format,
  className,
  decimals = 0,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const setText = (value: number) => {
      node.textContent = format ? format(value) : defaultFormat(value, decimals);
    };

    if (reduced || typeof window === 'undefined') {
      setText(to);
      return;
    }

    let raf = 0;
    let start = 0;
    let started = false;

    const tick = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / duration);
      setText(from + (to - from) * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    setText(from);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            raf = requestAnimationFrame(tick);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(node);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [from, to, duration, reduced, format, decimals]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {defaultFormat(from, decimals)}
    </span>
  );
}
