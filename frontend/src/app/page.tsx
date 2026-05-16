import { LandingHeader } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { ShowcaseSection } from '@/components/landing/showcase-section';
import { StatsSection } from '@/components/landing/stats-section';
import { WorkflowSection } from '@/components/landing/workflow-section';
import { CTASection } from '@/components/landing/cta-section';
import { LandingFooter } from '@/components/landing/footer';

export const metadata = {
  title: 'GitSense — Engineering Intelligence for GitHub Workspaces',
  description: 'Operational analytics for GitHub repositories — backlog pressure, stale signals, contributor concentration, and grounded workspace briefings for engineering teams.',
};

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground scroll-smooth-container reduce-shift">
      <LandingHeader />
      <main className="will-animate-gpu">
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <StatsSection />
        <WorkflowSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
