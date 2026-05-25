'use client';

import { useEffect, type ReactNode } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * LenisProvider — mounts a smooth-scroll engine on marketing routes only.
 *
 * IMPORTANT: This component must ONLY be rendered from `(landing)` and `(auth)`
 * route group layouts. The ESLint segment rule forbids importing it from
 * dashboard / operational surfaces, so the chunk stays out of the (app) bundle.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let raf = 0;
    let instance: { raf: (t: number) => void; destroy: () => void } | null = null;

    const loop = (time: number) => {
      if (instance) instance.raf(time);
      raf = requestAnimationFrame(loop);
    };

    import('lenis')
      .then((mod) => {
        if (cancelled) return;
        const Lenis = (mod as { default: new (opts: unknown) => typeof instance }).default;
        instance = new Lenis({
          duration: 1.1,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          smoothTouch: false,
        }) as typeof instance;
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        // Fall back silently to native scroll if Lenis is unavailable.
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (instance) instance.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
