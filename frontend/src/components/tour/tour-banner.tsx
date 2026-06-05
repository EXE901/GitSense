'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button, Eyebrow } from '@/components/primitives';
import { useProductTour } from '@/hooks/use-product-tour';
import { hasSeenTour, markTourSeen } from '@/lib/tour/storage';

type TourBannerProps = {
  isDemoMode: boolean;
  hasRepositories: boolean;
};

// `useSyncExternalStore` is the React-recommended pattern for reading
// browser-only state during render without hydration mismatch.
// On the server, `getServerSnapshot` returns `true` (treat as already seen)
// so the banner SSR-renders to nothing. On the client, the real value is
// read from localStorage on hydration.
function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function useHasSeenTour(mode: 'default' | 'demo'): boolean {
  return useSyncExternalStore(
    subscribeToStorage,
    () => hasSeenTour(mode),
    () => true,
  );
}

/**
 * Inline dismissible banner offering the product tour on first dashboard visit.
 *
 * - Hidden when the user has already seen / dismissed the tour for the
 *   current mode (`gitsense:tour:v1` or `gitsense:tour:v1:demo`).
 * - "Dismiss" hides the banner; the tour remains permanently available via
 *   the Help menu.
 */
export function TourBanner({ isDemoMode, hasRepositories }: TourBannerProps) {
  const mode = isDemoMode ? 'demo' : 'default';
  const seen = useHasSeenTour(mode);
  const [dismissed, setDismissed] = useState(false);
  const { startTour } = useProductTour({ isDemoMode, hasRepositories });

  const isVisible = !seen && !dismissed;

  if (!isVisible) return null;

  const title = isDemoMode
    ? 'Welcome to the GitSense demo'
    : 'New here? Take the GitSense tour';
  const body = isDemoMode
    ? 'Explore the platform with a 60-second guided tour of the demo workspace.'
    : 'A quick walkthrough of the dashboard, briefings, and issue insights — about 60 seconds.';

  function handleStart() {
    void startTour();
    setDismissed(true);
  }

  function handleDismiss() {
    markTourSeen(mode);
    setDismissed(true);
  }

  return (
    <section
      className="rounded-[12px] border p-4 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
      style={{
        background: 'var(--gs-accent-soft)',
        borderColor:
          'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
      }}
      role="region"
      aria-label="Product tour"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Eyebrow tone="accent">Onboarding</Eyebrow>
          <p
            className="mt-1.5 text-[14px] font-medium leading-snug"
            style={{ color: 'var(--gs-fg-0)' }}
          >
            {title}
          </p>
          <p
            className="mt-1 text-[12.5px] leading-[1.5]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            {body} You can re-open the tour anytime from the Help menu.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" onClick={handleStart}>
            Take the tour
          </Button>
        </div>
      </div>
    </section>
  );
}
