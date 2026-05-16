'use client';

export function AuthBackgroundMotion() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/40 to-background" />

      {/* Animated grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            className="animate-pulse"
          >
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Ambient light orbs - subtle positioning */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -ml-48 -mb-48 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

      {/* Subtle scanning lines - operational aesthetic */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/0 via-primary/[0.02] to-primary/0 opacity-40"
          style={{
            animation: 'scanlines 8s linear infinite',
            backgroundSize: '100% 2px',
          }}
        />
      </div>

      {/* Corner accents - subtle framing */}
      <div className="absolute top-0 left-0 w-48 h-px bg-gradient-to-r from-primary/30 to-transparent opacity-50" />
      <div className="absolute top-0 left-0 h-48 w-px bg-gradient-to-b from-primary/30 to-transparent opacity-50" />
      <div className="absolute bottom-0 right-0 w-48 h-px bg-gradient-to-l from-accent/30 to-transparent opacity-50" />
      <div className="absolute bottom-0 right-0 h-48 w-px bg-gradient-to-t from-accent/30 to-transparent opacity-50" />
    </div>
  );
}
