'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type WordRevealProps = {
  text: string;
  className?: string;
  wordClassName?: string;
  stagger?: number;
  y?: number;
  duration?: number;
  startDelay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
};

/**
 * WordReveal — splits text into <span> per word.
 * Words are stamped with data-reveal="hidden" and flipped to "visible" by an
 * IntersectionObserver. No React state.
 */
export function WordReveal({
  text,
  className,
  wordClassName,
  stagger = 40,
  y = 24,
  duration = 480,
  startDelay = 0,
  as: Tag = 'span',
}: WordRevealProps) {
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
      { threshold: isMobile ? 0.1 : 0.2, rootMargin }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const words = text.split(/(\s+)/);

  const wrapperStyle: CSSProperties = {
    ['--reveal-y' as string]: `${y}px`,
  };

  return (
    <Tag ref={ref as never} className={className} style={wrapperStyle}>
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) {
          return <span key={i}>{word}</span>;
        }
        const wordStyle: CSSProperties = {
          display: 'inline-block',
          ['--reveal-delay' as string]: `${startDelay + Math.floor(i / 2) * stagger}ms`,
          transitionDuration: `${duration}ms`,
        };
        return (
          <span
            key={i}
            data-reveal="hidden"
            className={wordClassName}
            style={wordStyle}
          >
            {word}
          </span>
        );
      })}
    </Tag>
  );
}
