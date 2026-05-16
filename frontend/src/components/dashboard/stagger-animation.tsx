'use client';

import { useEffect, useState } from 'react';

export function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationId: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [value, duration]);

  return <>{count.toLocaleString()}</>;
}

export function StaggerContainer({
  children,
  staggerDelay = 50,
}: {
  children: React.ReactNode[];
  staggerDelay?: number;
}) {
  return (
    <>
      {Array.isArray(children) &&
        children.map((child, index) => (
          <div
            key={index}
            style={{
              animation: `slideInUp 0.6s ease-out ${index * staggerDelay}ms both`,
            }}
          >
            {child}
          </div>
        ))}
    </>
  );
}

// Inline CSS animations
const style = `
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = style;
  document.head.appendChild(styleEl);
}
