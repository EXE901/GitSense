'use client';

import type { CSSProperties } from 'react';

type ShimmerProps = {
  className?: string;
  style?: CSSProperties;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  height?: number | string;
  width?: number | string;
};

const radius: Record<NonNullable<ShimmerProps['rounded']>, string> = {
  sm: 'rounded-[6px]',
  md: 'rounded-[8px]',
  lg: 'rounded-[12px]',
  full: 'rounded-full',
};

/**
 * Shimmer — canonical skeleton primitive. Consolidates ad-hoc shimmer classes.
 */
export function Shimmer({
  className = '',
  style,
  rounded = 'md',
  height,
  width,
}: ShimmerProps) {
  const inline: CSSProperties = {
    ...(height !== undefined ? { height } : {}),
    ...(width !== undefined ? { width } : {}),
    ...style,
  };
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer ${radius[rounded]} ${className}`}
      style={inline}
    />
  );
}
