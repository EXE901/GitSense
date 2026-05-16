'use client';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Premium glass-like card - theme-aware */}
      <div className="relative bg-card/85 border border-border rounded-2xl p-8 backdrop-blur-xl animate-fade-in-up shadow-xl shadow-foreground/[0.08] dark:shadow-black/40">
        {/* Subtle gradient accent border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Content wrapper */}
        <div className="relative space-y-8">
          {/* Heading section */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Divider - theme-aware */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
