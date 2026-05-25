'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

type AtmosphericLayerProps = {
  intensity?: 'full' | 'muted';
  showConstellation?: boolean;
  cursorReactive?: boolean;
  className?: string;
};

/**
 * AtmosphericLayer — six-layer ambient depth stack.
 *
 *   1. Aurora           (two blurred gradient blobs, slow GPU drift)
 *   2. Grid             (low-opacity SVG pattern with radial fade)
 *   3. Constellation    (commit-graph motif, far/near split, async
 *                        per-node pulse, tapered shimmer trails,
 *                        cursor-aware opacity + localized halo,
 *                        hero-content-anchored attenuation mask)
 *   4. Cursor bloom     (4-stop tapered radial — desktop only)
 *   5. Scanline         (very faint vertical sweep)
 *   6. Vignette         (radial darkening at edges)
 *
 * Architecture:
 *   - Transform / opacity / filter only — no canvas, no WebGL.
 *   - One rAF loop drives cursor lerp + writes CSS vars on refs.
 *   - One passive scroll listener (rAF-batched) writes
 *     `--gs-scroll-progress` for mobile / touch atmospheric
 *     progression.
 *   - No React state on mousemove or scroll.
 *   - Cursor effects gated by prefers-reduced-motion / hover:none.
 *   - Scroll progression gated by prefers-reduced-motion only
 *     (works on touch — that's the whole point).
 *   - All keyframe animations honored by global reduced-motion rule.
 */
export function AtmosphericLayer({
  intensity = 'full',
  showConstellation = true,
  cursorReactive = true,
  className,
}: AtmosphericLayerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const constellationRef = useRef<SVGSVGElement | null>(null);
  const cursorBloomRef = useRef<HTMLDivElement | null>(null);

  // Deterministic far/near partition, computed once.
  const { farDots, nearDots, farLines, nearLines } = useMemo(
    () => partitionConstellation(),
    [],
  );

  // Per-node deterministic async durations + delays so no two
  // adjacent nodes ever pulse in sync. SSR-stable (no Math.random).
  const nodeRhythms = useMemo(() => buildNodeRhythms(), []);

  // --- Cursor lerp loop (desktop only) -----------------------------
  useEffect(() => {
    if (!cursorReactive) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Bail only if the device has NO hover capability AT ALL. Hybrid
    // laptops (touchscreen + mouse) report (hover: hover) AND
    // (pointer: coarse) simultaneously — they should still get
    // cursor reactivity. Only true touch-only devices match BOTH
    // gates below.
    if (
      window.matchMedia?.('(hover: none)').matches &&
      window.matchMedia?.('(pointer: coarse)').matches
    ) return;

    let raf = 0;
    let running = false;
    let targetX = 0.5;
    let targetY = 0.5;
    let currentX = 0.5;
    let currentY = 0.5;
    // Baseline intensity (kept in sync with the --gs-cursor-intensity
    // default in globals.css) so the atmosphere is alive at rest.
    // Cursor activity ramps target → 1 and decays back to baseline
    // on pointerleave / blur / tab hide.
    const baselineIntensity = 0.35;
    let targetIntensity = baselineIntensity;
    let currentIntensity = baselineIntensity;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const writeVars = () => {
      const cons = constellationRef.current;
      const bloom = cursorBloomRef.current;
      const root = rootRef.current;
      // NOTE: previous aurora `--cursor-dx/--cursor-dy` writes were
      // removed in the runtime stabilization pass — the aurora
      // keyframes (gs-aurora-a/b) animate `transform` directly and
      // override any inline transform that referenced those vars,
      // making those RAF writes dead work.
      //
      // Constellation reactive vars — proximity-driven brightness +
      // far/near parallax (4 px near, 2 px far at peak).
      if (cons) {
        const xPct = (currentX * 100).toFixed(2);
        const yPct = (currentY * 100).toFixed(2);
        cons.style.setProperty('--gs-cursor-x', `${xPct}%`);
        cons.style.setProperty('--gs-cursor-y', `${yPct}%`);
        cons.style.setProperty(
          '--gs-cursor-intensity',
          currentIntensity.toFixed(3),
        );
        const dx = (currentX - 0.5);
        const dy = (currentY - 0.5);
        // Near layer max ±4 px; far layer max ±2 px.
        cons.style.setProperty('--gs-px-near-x', `${(dx * 8).toFixed(2)}px`);
        cons.style.setProperty('--gs-px-near-y', `${(dy * 8).toFixed(2)}px`);
        cons.style.setProperty('--gs-px-far-x', `${(dx * 4).toFixed(2)}px`);
        cons.style.setProperty('--gs-px-far-y', `${(dy * 4).toFixed(2)}px`);
      }
      // Cursor bloom — fixed-position element, vars in px.
      if (bloom) {
        bloom.style.setProperty(
          '--bloom-x',
          `${(currentX * window.innerWidth).toFixed(1)}px`,
        );
        bloom.style.setProperty(
          '--bloom-y',
          `${(currentY * window.innerHeight).toFixed(1)}px`,
        );
        bloom.style.opacity = currentIntensity.toFixed(3);
      }
      if (root) {
        // Drive halo opacity (CSS reads --gs-cursor-intensity from root)
        root.style.setProperty('--gs-cursor-intensity', currentIntensity.toFixed(3));
      }
    };

    const tick = () => {
      // Heavier follow per locked spec (0.09 position, 0.08 opacity).
      currentX = lerp(currentX, targetX, 0.09);
      currentY = lerp(currentY, targetY, 0.09);
      currentIntensity = lerp(currentIntensity, targetIntensity, 0.08);
      writeVars();

      const positionStill =
        Math.abs(targetX - currentX) < 0.001 &&
        Math.abs(targetY - currentY) < 0.001;
      const opacityStill = Math.abs(targetIntensity - currentIntensity) < 0.002;
      if (positionStill && opacityStill) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const ensureRunning = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      targetX = e.clientX / window.innerWidth;
      targetY = e.clientY / window.innerHeight;
      targetIntensity = 1;
      ensureRunning();
    };

    const onLeave = () => {
      targetIntensity = baselineIntensity;
      ensureRunning();
    };

    const onVisibility = () => {
      if (document.hidden) {
        targetIntensity = baselineIntensity;
        ensureRunning();
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('blur', onLeave);
    document.addEventListener('visibilitychange', onVisibility);

    // Initial paint so first frame isn't a flicker.
    writeVars();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [cursorReactive]);

  // --- Scroll-linked atmospheric progression (mobile-friendly) -----
  // Writes `--gs-scroll-progress` (0..1) on the root. Gated only by
  // prefers-reduced-motion. Works on touch — that's its purpose.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let pending = false;

    const update = () => {
      pending = false;
      const root = rootRef.current;
      if (!root) return;
      const max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty('--gs-scroll-progress', p.toFixed(3));
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const muted = intensity === 'muted';
  const opAurora = muted ? 0.07 : 0.16;
  const opGrid = muted ? 0.03 : 0.05;
  // Constellation outer opacity is now theme-aware via the CSS
  // variable `--gs-constellation-opacity` declared on .gs-atmosphere.
  // The `muted` variant (auth split layout) still uses a fixed
  // 0.06 baseline since it never gets a theme-aware lift.
  const opVignette = muted ? 0.06 : 0.1;
  const opScanline = 0.02;

  // Aurora orb inline styles — gradients, size, placement, blur, opacity.
  // No `transform` set inline anymore (the keyframe owns transform).
  // Blur radius reduced from 80/90px → 56/64px for Intel iGPU /
  // Edge efficiency-mode survival (see CSS containment in
  // globals.css). Visual softness preserved by the 60vw size.
  const auroraAStyle: CSSProperties = {
    background:
      'radial-gradient(closest-side, color-mix(in oklch, var(--gs-accent-primary) 70%, transparent) 0%, transparent 70%)',
    opacity: opAurora,
    width: '60vw',
    height: '60vw',
    top: '-15vw',
    right: '-12vw',
    filter: 'blur(56px)',
  };

  const auroraBStyle: CSSProperties = {
    background:
      'radial-gradient(closest-side, color-mix(in oklch, var(--gs-accent-deep) 75%, transparent) 0%, transparent 70%)',
    opacity: opAurora * 0.9,
    width: '64vw',
    height: '64vw',
    bottom: '-18vw',
    left: '-14vw',
    filter: 'blur(64px)',
  };

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`gs-atmosphere pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      {/* 1. Aurora — keyframes drive transform; no refs needed. */}
      <div className="gs-aurora-a absolute gs-gpu rounded-full" style={auroraAStyle} />
      <div className="gs-aurora-b absolute gs-gpu rounded-full" style={auroraBStyle} />

      {/* 2. Grid */}
      <svg
        className="absolute inset-0 h-full w-full gs-grid-drift"
        style={{
          opacity: opGrid,
          maskImage: 'radial-gradient(ellipse 80% 60% at center, black 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at center, black 40%, transparent 90%)',
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

      {/* 3. Constellation — content-anchored mask, far/near split,
             tapered shimmer, async pulse, cursor-aware lines+halo */}
      {showConstellation ? (
        <svg
          ref={constellationRef}
          className="gs-constellation absolute inset-0 h-full w-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: muted ? 0.06 : 'var(--gs-constellation-opacity)' }}
        >
          <defs>
            {/* Tapered shimmer gradient — transparent → accent → transparent.
                Used as stroke on shimmer paths so head + tail fade. */}
            <linearGradient id="gs-shimmer-grad" x1="0" y1="0" x2="1" y2="0">
              {/* Calibration v2: tighter, sharper center.
                  4-stop instead of 3 — tapered outer ramps in
                  35 % / 65 %, hard bright core at 50 %. The
                  visible glint is now a focused signal trace,
                  not a glowing rope. */}
              <stop offset="0%" stopColor="var(--gs-accent-primary)" stopOpacity="0" />
              <stop offset="35%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.55" />
              <stop offset="50%" stopColor="var(--gs-accent-cyan)" stopOpacity="1" />
              <stop offset="65%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--gs-accent-primary)" stopOpacity="0" />
            </linearGradient>
            {/* Packet gradient — bright leading edge with a short
                trailing fade. Used as stroke on telemetry packet
                paths. Sharper than the shimmer; reads as a
                precise operational pulse, not a glow. */}
            <linearGradient id="gs-packet-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--gs-accent-cyan)" stopOpacity="0" />
              <stop offset="55%" stopColor="var(--gs-accent-cyan)" stopOpacity="0.45" />
              <stop offset="85%" stopColor="var(--gs-accent-cyan)" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.92" />
            </linearGradient>
          </defs>

          {/* FAR LAYER — dimmer, smaller, slightly less parallax.
              Transform owned by CSS .gs-cons-layer--far (composes
              cursor parallax via --gs-px-far-x/y). */}
          <g className="gs-cons-layer gs-cons-layer--far">
            {farLines.map(([x1, y1, x2, y2], i) => (
              <line
                key={`fl-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="gs-cons-line"
              />
            ))}
            {farDots.map(([x, y, delay], i) => {
              const rhythm = nodeRhythms[(i * 7) % nodeRhythms.length];
              return (
                <circle
                  key={`fd-${i}`}
                  cx={x}
                  cy={y}
                  r={1.9}
                  className="gs-cons-node"
                  style={{
                    animationDelay: `${delay + rhythm.delay}s`,
                    animationDuration: `${rhythm.duration}s`,
                  }}
                />
              );
            })}
          </g>

          {/* NEAR LAYER — brighter, larger, full parallax.
              Transform is owned by CSS (.gs-cons-layer--near) so the
              scroll-Y composition can layer in. No inline transform. */}
          <g className="gs-cons-layer gs-cons-layer--near">
            {nearLines.map(([x1, y1, x2, y2], i) => (
              <line
                key={`nl-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="gs-cons-line"
              />
            ))}

            {/* 2 tapered shimmer trails — long signal sweeps,
                staggered 0s and 7s so they never peak together.
                These remain the slow, broad atmospheric traces. */}
            <path
              d={SHIMMER_PATH_A}
              className="gs-cons-shimmer"
              style={{ animationDelay: '0s' }}
            />
            <path
              d={SHIMMER_PATH_B}
              className="gs-cons-shimmer"
              style={{ animationDelay: '7s' }}
            />

            {/* 2 telemetry packets — small, sharp, more frequent.
                Cycle 9 s, staggered 0s / 4.5s so each is mid-flight
                when the other is hidden. Combined with the two
                shimmer trails (cycle 14 s, stagger 0/7s), the user
                almost always sees SOME quiet signal moving through
                the network — but at most 2 simultaneous (a packet
                and a shimmer trail in different regions). Never
                synchronized.

                Path geometry traces real graph edges in zones the
                hero copy does NOT occupy (mid-right band, lower
                band). Deterministic delays — no JS, no DOM cost. */}
            <path
              d={PACKET_PATH_A}
              className="gs-cons-packet gs-cons-packet--a"
              style={{ animationDelay: '0s' }}
            />
            <path
              d={PACKET_PATH_B}
              className="gs-cons-packet gs-cons-packet--b"
              style={{ animationDelay: '4.5s' }}
            />

            {nearDots.map(([x, y, delay], i) => {
              const rhythm = nodeRhythms[(i * 11) % nodeRhythms.length];
              return (
                <circle
                  key={`nd-${i}`}
                  cx={x}
                  cy={y}
                  r={2.4}
                  className="gs-cons-node"
                  style={{
                    animationDelay: `${delay + rhythm.delay}s`,
                    animationDuration: `${rhythm.duration}s`,
                  }}
                />
              );
            })}
          </g>
        </svg>
      ) : null}

      {/* 4. Cursor bloom — desktop only, gated by CSS @media.
             Initial opacity is owned by CSS (.gs-cursor-bloom)
             so the reduced-motion mode can keep it visible
             at a baseline 0.35 with no JS involvement. */}
      <div ref={cursorBloomRef} className="gs-cursor-bloom absolute inset-0" />

      {/* 5. Scanline */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, color-mix(in oklch, var(--gs-accent-primary) 8%, transparent) 4px)',
          opacity: opScanline,
        }}
      />

      {/* 6. Vignette */}
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

// Deterministic per-node pulse rhythms — durations 5–8 s, delays 0–4 s.
// SSR-stable. Indexed by (i * coprime) % len to spread phases.
function buildNodeRhythms() {
  return [
    { duration: 5.2, delay: 0.0 },
    { duration: 6.1, delay: 0.9 },
    { duration: 7.4, delay: 1.7 },
    { duration: 5.8, delay: 2.4 },
    { duration: 6.7, delay: 3.1 },
    { duration: 7.1, delay: 0.5 },
    { duration: 5.5, delay: 1.3 },
    { duration: 8.0, delay: 2.0 },
    { duration: 6.4, delay: 2.8 },
    { duration: 7.7, delay: 3.6 },
    { duration: 5.9, delay: 1.1 },
    { duration: 6.8, delay: 2.2 },
    { duration: 7.2, delay: 3.4 },
  ];
}

function partitionConstellation() {
  // Split the existing graph into far + near using the original
  // delay ordering parity. Even-indexed → far, odd-indexed → near.
  // The split is deterministic and SSR-stable.
  const farDots: Array<[number, number, number]> = [];
  const nearDots: Array<[number, number, number]> = [];
  for (let i = 0; i < CONSTELLATION_DOTS.length; i++) {
    (i % 2 === 0 ? farDots : nearDots).push(CONSTELLATION_DOTS[i]);
  }
  // Split lines by parity too — each layer keeps its own connected
  // edges. Cross-layer edges go to NEAR (so it dominates depth).
  const farLines: Array<[number, number, number, number]> = [];
  const nearLines: Array<[number, number, number, number]> = [];
  for (let i = 0; i < CONSTELLATION_LINES.length; i++) {
    (i % 2 === 0 ? farLines : nearLines).push(CONSTELLATION_LINES[i]);
  }
  return { farDots, nearDots, farLines, nearLines };
}

// Pre-baked positions form a faint commit-graph-like motif.
// Each dot has [x, y, animationDelay-original].
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

// Shimmer trails — long signal sweeps, broad atmospheric traces.
// SVG path strings; coordinates in the same 1200x800 space.
// Path A — upper row, sweeping left to right.
const SHIMMER_PATH_A =
  'M 120 120 L 220 160 L 330 130 L 430 200 L 540 170 L 650 240 L 760 200 L 880 280 L 990 240 L 1080 320';
// Path B — middle row, sweeping right to left.
const SHIMMER_PATH_B =
  'M 960 500 L 820 520 L 690 460 L 560 480 L 420 440 L 300 400 L 180 360';

// Telemetry packets — shorter traversals, small + sharp.
// Constrained to the right + lower bands where hero copy doesn't
// sit. Each path is 3–4 hops along real constellation edges.
// Packet A — diagonal descent through the right cluster.
const PACKET_PATH_A =
  'M 880 280 L 990 240 L 1080 320 L 940 660';
// Packet B — lower row mid → right.
const PACKET_PATH_B =
  'M 520 680 L 660 660 L 800 700 L 1060 720';
