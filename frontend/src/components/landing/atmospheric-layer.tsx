'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type AtmosphericLayerProps = {
  intensity?: 'full' | 'muted';
  showConstellation?: boolean;
  cursorReactive?: boolean;
  className?: string;
};

/**
 * AtmosphericLayer — five-layer ambient depth stack:
 *
 *   1. Aurora (two large gradient blobs, slow GPU drift)
 *   2. Grid (low-opacity SVG pattern with radial edge fade)
 *   3. Constellation (repo-graph dot motif, slow pulse)
 *   4. Scanline (very faint vertical sweep)
 *   5. Vignette (radial darkening at edges)
 *
 * All transform/opacity only — no canvas, no WebGL. Fully GPU composited.
 * Honors prefers-reduced-motion via globals.css overrides.
 */
export function AtmosphericLayer({
  intensity = 'full',
  showConstellation = true,
  cursorReactive = true,
  className,
}: AtmosphericLayerProps) {
  const auroraARef = useRef<HTMLDivElement | null>(null);
  const auroraBRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cursorReactive) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia?.('(hover: none)').matches) return;

    let raf = 0;
    let targetX = 0.5;
    let targetY = 0.5;
    let currentX = 0.5;
    let currentY = 0.5;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth;
      targetY = e.clientY / window.innerHeight;
    };

    const tick = () => {
      currentX = lerp(currentX, targetX, 0.05);
      currentY = lerp(currentY, targetY, 0.05);
      const a = auroraARef.current;
      const b = auroraBRef.current;
      if (a) {
        a.style.setProperty('--cursor-dx', `${(currentX - 0.5) * 60}px`);
        a.style.setProperty('--cursor-dy', `${(currentY - 0.5) * 60}px`);
      }
      if (b) {
        b.style.setProperty('--cursor-dx', `${(0.5 - currentX) * 60}px`);
        b.style.setProperty('--cursor-dy', `${(0.5 - currentY) * 60}px`);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [cursorReactive]);

  const muted = intensity === 'muted';
  const opAurora = muted ? 0.07 : 0.16;
  const opGrid = muted ? 0.03 : 0.05;
  const opConstellation = muted ? 0.06 : 0.12;
  const opVignette = muted ? 0.06 : 0.1;
  const opScanline = 0.02;

  const auroraAStyle: CSSProperties = {
    background:
      'radial-gradient(closest-side, color-mix(in oklch, var(--gs-accent-primary) 70%, transparent) 0%, transparent 70%)',
    opacity: opAurora,
    width: '60vw',
    height: '60vw',
    top: '-15vw',
    right: '-12vw',
    filter: 'blur(80px)',
    transform:
      'translate3d(var(--cursor-dx, 0), var(--cursor-dy, 0), 0)',
  };

  const auroraBStyle: CSSProperties = {
    background:
      'radial-gradient(closest-side, color-mix(in oklch, var(--gs-accent-deep) 75%, transparent) 0%, transparent 70%)',
    opacity: opAurora * 0.9,
    width: '64vw',
    height: '64vw',
    bottom: '-18vw',
    left: '-14vw',
    filter: 'blur(90px)',
    transform:
      'translate3d(var(--cursor-dx, 0), var(--cursor-dy, 0), 0)',
  };

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {/* Aurora blobs */}
      <div
        ref={auroraARef}
        className="gs-aurora-a absolute gs-gpu rounded-full"
        style={auroraAStyle}
      />
      <div
        ref={auroraBRef}
        className="gs-aurora-b absolute gs-gpu rounded-full"
        style={auroraBStyle}
      />

      {/* Grid */}
      <svg
        className="absolute inset-0 h-full w-full gs-grid-drift"
        style={{
          opacity: opGrid,
          maskImage:
            'radial-gradient(ellipse 80% 60% at center, black 40%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at center, black 40%, transparent 90%)',
        }}
      >
        <defs>
          <pattern id="gs-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-[color:var(--gs-fg-1)]"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gs-grid)" />
      </svg>

      {/* Constellation (repo-graph dot motif) */}
      {showConstellation ? (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: opConstellation }}
        >
          {CONSTELLATION_LINES.map(([x1, y1, x2, y2], i) => (
            <line
              key={`l-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={1}
              className="text-[color:var(--gs-accent-primary)]"
            />
          ))}
          {CONSTELLATION_DOTS.map(([x, y, delay], i) => (
            <circle
              key={`d-${i}`}
              cx={x}
              cy={y}
              r={2.2}
              fill="currentColor"
              className="gs-constellation-pulse text-[color:var(--gs-accent-primary)]"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </svg>
      ) : null}

      {/* Scanline */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, color-mix(in oklch, var(--gs-accent-primary) 8%, transparent) 4px)',
          opacity: opScanline,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, oklch(0 0 0 / 0.5) 100%)',
          opacity: opVignette,
        }}
      />
    </div>
  );
}

// Pre-baked positions form a faint commit-graph-like motif.
// Each dot has [x, y, animationDelay].
const CONSTELLATION_DOTS: Array<[number, number, number]> = [
  [120, 120, 0],
  [220, 160, 0.4],
  [330, 130, 0.8],
  [430, 200, 1.2],
  [540, 170, 1.6],
  [650, 240, 2.0],
  [760, 200, 2.4],
  [880, 280, 2.8],
  [990, 240, 3.2],
  [1080, 320, 3.6],
  [180, 360, 0.6],
  [300, 400, 1.0],
  [420, 440, 1.4],
  [560, 480, 1.8],
  [690, 460, 2.2],
  [820, 520, 2.6],
  [960, 500, 3.0],
  [240, 600, 1.1],
  [380, 640, 1.5],
  [520, 680, 1.9],
  [660, 660, 2.3],
  [800, 700, 2.7],
  [940, 660, 3.1],
  [1060, 720, 3.5],
];

const CONSTELLATION_LINES: Array<[number, number, number, number]> = [
  [120, 120, 220, 160],
  [220, 160, 330, 130],
  [330, 130, 430, 200],
  [430, 200, 540, 170],
  [540, 170, 650, 240],
  [650, 240, 760, 200],
  [760, 200, 880, 280],
  [880, 280, 990, 240],
  [990, 240, 1080, 320],
  [180, 360, 300, 400],
  [300, 400, 420, 440],
  [420, 440, 560, 480],
  [560, 480, 690, 460],
  [690, 460, 820, 520],
  [820, 520, 960, 500],
  [240, 600, 380, 640],
  [380, 640, 520, 680],
  [520, 680, 660, 660],
  [660, 660, 800, 700],
  [800, 700, 940, 660],
  [940, 660, 1060, 720],
  [430, 200, 420, 440],
  [560, 480, 540, 170],
  [690, 460, 660, 660],
];
