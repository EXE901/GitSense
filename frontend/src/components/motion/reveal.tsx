'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  y?: number;
  delay?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Reveal — CSS-driven IO reveal.
 *
 * No React state. The IO callback writes directly to `element.dataset.reveal`,
 * which is observed by `[data-reveal]` CSS in globals.css.
 *
 * SSR renders `data-reveal="hidden"`. A `<noscript>` override (added at the
 * layout level) sets `[data-reveal]` to visible when JS is unavailable.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  y = 24,
  delay = 0,
  duration,
  threshold = 0.15,
  once = true,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      node.dataset.reveal = 'visible';
      return;
    }

    // rootMargin is mobile-aware: on narrow viewports we fire earlier so the
    // reveal isn't waiting for the user to scroll past the section bottom
    // (which often never happens during a fast swipe on tall sections).
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;
    const rootMargin = isMobile ? '0px 0px 10% 0px' : '0px 0px -10% 0px';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.dataset.reveal = 'visible';
            if (once) observer.disconnect();
          } else if (!once) {
            node.dataset.reveal = 'hidden';
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, once]);

  const mergedStyle: CSSProperties = {
    ['--reveal-y' as string]: `${y}px`,
    ['--reveal-delay' as string]: `${delay}ms`,
    ...(duration ? { transitionDuration: `${duration}ms` } : {}),
    ...style,
  };

  return (
    <Tag
      ref={ref as never}
      data-reveal="hidden"
      style={mergedStyle}
      className={className}
    >
      {children}
    </Tag>
  );
}
