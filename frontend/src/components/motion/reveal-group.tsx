'use client';

import { Children, cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type ElementType, type ReactElement, type ReactNode } from 'react';

type RevealGroupProps = {
  children: ReactNode;
  as?: ElementType;
  stagger?: number;
  y?: number;
  duration?: number;
  threshold?: number;
  className?: string;
  style?: CSSProperties;
  startDelay?: number;
};

/**
 * RevealGroup — staggers direct children using inline --reveal-delay per child.
 * Each child is rendered with data-reveal="hidden" and switched to "visible"
 * imperatively when the group intersects the viewport.
 */
export function RevealGroup({
  children,
  as: Tag = 'div',
  stagger = 80,
  y = 24,
  duration,
  threshold = 0.15,
  className,
  style,
  startDelay = 0,
}: RevealGroupProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      node.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.dataset.reveal = 'visible';
      });
      return;
    }
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;
    const rootMargin = isMobile ? '0px 0px 10% 0px' : '0px 0px -10% 0px';

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            node.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
              el.dataset.reveal = 'visible';
            });
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  const groupStyle: CSSProperties = {
    ['--reveal-y' as string]: `${y}px`,
    ['--reveal-stagger' as string]: `${stagger}ms`,
    ...style,
  };

  const items = Children.toArray(children).map((child, index) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{
      style?: CSSProperties;
      ['data-reveal']?: string;
    }>;
    const childStyle: CSSProperties = {
      ['--i' as string]: index,
      ['--reveal-delay' as string]: `calc(${startDelay}ms + ${index} * ${stagger}ms)`,
      ...(duration ? { transitionDuration: `${duration}ms` } : {}),
      ...(element.props.style ?? {}),
    };
    return cloneElement(element, {
      style: childStyle,
      'data-reveal': 'hidden',
    });
  });

  return (
    <Tag ref={ref as never} data-reveal-group="" style={groupStyle} className={className}>
      {items}
    </Tag>
  );
}
