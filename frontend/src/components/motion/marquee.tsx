'use client';

import { Children, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from './use-reduced-motion';

type MarqueeProps = {
  children: ReactNode;
  speed?: number;
  className?: string;
  pauseOnHover?: boolean;
  fadeEdges?: boolean;
};

/**
 * Marquee — CSS-only horizontal scroller. Duplicates content so the loop is seamless.
 * Pauses automatically when prefers-reduced-motion is set.
 */
export function Marquee({
  children,
  speed = 40,
  className = '',
  pauseOnHover = true,
  fadeEdges = true,
}: MarqueeProps) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);

  const style: CSSProperties = {
    ['--gs-marquee-duration' as string]: `${speed}s`,
    maskImage: fadeEdges
      ? 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)'
      : undefined,
    WebkitMaskImage: fadeEdges
      ? 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)'
      : undefined,
  };

  return (
    <div className={`overflow-hidden ${className}`} style={style}>
      <div
        className={`gs-marquee ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        data-paused={reduced ? 'true' : undefined}
      >
        <div className="flex shrink-0 items-center gap-12 pr-12">{items}</div>
        <div className="flex shrink-0 items-center gap-12 pr-12" aria-hidden="true">
          {items}
        </div>
      </div>
    </div>
  );
}
