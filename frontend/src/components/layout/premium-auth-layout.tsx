'use client';

import { AuthBackgroundMotion } from '@/components/auth/background-motion';
import { ProductLogo } from '@/components/branding/product-logo';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { BarChart3, Search, Zap } from 'lucide-react';

interface PremiumAuthLayoutProps {
  children: React.ReactNode;
}

export function PremiumAuthLayout({ children }: PremiumAuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Background motion */}
      <AuthBackgroundMotion />

      {/* Main content container */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <div className="absolute left-4 top-4 z-20 lg:hidden">
          <ProductLogo href="/" size="sm" showText={true} />
        </div>
        <div className="absolute right-4 top-4 z-20">
          <ThemeToggle compact />
        </div>

        {/* Left sidebar - Branding and messaging (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-start p-12 bg-gradient-to-br from-card/80 to-background/40 backdrop-blur-sm border-r border-border/50">
          <div className="max-w-md space-y-12">
            {/* GitSense branding */}
            <div className="animate-fade-in-up">
              <ProductLogo href="/" size="lg" showText={true} className="mb-6" />
              <h2 className="text-3xl font-bold text-foreground mb-4">Engineering Operations Intelligence</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Turn GitHub repository activity into operational insights. Track velocity, surface stalled work, and stay ahead of backlog risk.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {[
                { icon: BarChart3, label: 'Issue Velocity Tracking', desc: 'Cycle time and resolution metrics' },
                { icon: Zap, label: 'Bottleneck Detection', desc: 'Stalled issues and contributor blockers' },
                { icon: Search, label: 'Workspace Analytics', desc: 'Repository activity and trends' },
              ].map((feature) => (
                <div key={feature.label} className="flex gap-3 text-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <feature.icon size={17} />
                  </span>
                  <div>
                    <div className="font-semibold text-foreground">{feature.label}</div>
                    <div className="text-muted-foreground/70">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security & trust */}
            <div className="pt-8 border-t border-border/30 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <p className="text-xs text-muted-foreground/60 mb-3">Built for developers</p>
              <p className="text-sm text-muted-foreground">GitHub-native, privacy-first, always free</p>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
