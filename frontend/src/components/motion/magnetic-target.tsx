'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type MagneticTargetProps = {
  children: ReactNode;
  strength?: number;
  radius?: number;
  className?: string;
};

/**
 * MagneticTarget — wraps a CTA so the cursor gently attracts the element
 * within `radius` pixels, capped at `strength` pixels of displacement.
 *
 * - GPU-cheap: writes `transform: translate3d` directly to a single ref.
 * - Disabled on touch + when prefers-reduced-motion is set.
 * - Marketing-only; never imported by (app) chunks.
 */
export function MagneticTarget({
  children,
  strength = 8,
  radius = 90,
  className,
}: MagneticTargetProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia?.('(hover: none)').matches) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        targetX = 0;
        targetY = 0;
        return;
      }
      const pull = 1 - dist / radius;
      targetX = (dx / radius) * strength * pull;
      targetY = (dy / radius) * strength * pull;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    const tick = () => {
      currentX = lerp(currentX, targetX, 0.18);
      currentY = lerp(currentY, targetY, 0.18);
      if (node) {
        node.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, [strength, radius]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display: 'inline-flex',
        willChange: 'transform',
        transition: 'transform 200ms var(--ease-decelerate)',
      }}
    >
      {children}
    </div>
  );
}
