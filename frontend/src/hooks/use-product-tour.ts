'use client';

import { useCallback, useEffect, useRef } from 'react';
import { emitTourEvent } from '@/lib/tour/events';
import { markTourSeen, type TourMode } from '@/lib/tour/storage';
import {
  getStepsForVariant,
  selectVariant,
  type TourStep,
} from '@/lib/tour/steps';

type Driver = {
  destroy: () => void;
  drive: (stepIndex?: number) => void;
  isActive: () => boolean;
  getActiveIndex: () => number | undefined;
  getActiveStep: () => { element?: unknown; popover?: unknown } | undefined;
};

type UseProductTourArgs = {
  isDemoMode: boolean;
  hasRepositories: boolean;
};

type StartTourOptions = {
  /**
   * When true, the tour starts but does NOT mark itself as seen on completion.
   * Useful when the user explicitly re-opens the tour from the Help menu.
   */
  ephemeral?: boolean;
};

/**
 * React wrapper around driver.js with lazy dynamic import so the library
 * does not land in the initial dashboard bundle.
 *
 * The hook fires lifecycle events on `window` (`gitsense:tour-*`) so future
 * telemetry can attach without changes here.
 */
export function useProductTour({
  isDemoMode,
  hasRepositories,
}: UseProductTourArgs) {
  const driverInstanceRef = useRef<Driver | null>(null);
  const lastStepIndexRef = useRef<number>(-1);
  const completedRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (driverInstanceRef.current) {
      try {
        driverInstanceRef.current.destroy();
      } catch {
        // Already destroyed.
      }
      driverInstanceRef.current = null;
    }
    lastStepIndexRef.current = -1;
    completedRef.current = false;
  }, []);

  // Destroy any active tour on unmount.
  useEffect(() => cleanup, [cleanup]);

  const startTour = useCallback(
    async (options: StartTourOptions = {}) => {
      // SSR guard.
      if (typeof window === 'undefined') return;

      // Cancel any existing instance before starting a fresh run.
      cleanup();

      const mode: TourMode = isDemoMode ? 'demo' : 'default';
      const variant = selectVariant({ isDemoMode, hasRepositories });
      const steps: TourStep[] = getStepsForVariant(variant);

      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      // Lazy-load driver.js so it stays out of the initial bundle.
      const [{ driver }] = await Promise.all([
        import('driver.js'),
        // The library ships its own CSS. We import it once; subsequent
        // imports are deduped by the bundler.
        import('driver.js/dist/driver.css'),
      ]);

      const instance = driver({
        steps,
        animate: !prefersReducedMotion,
        showProgress: true,
        allowClose: true,
        smoothScroll: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 12,
        popoverOffset: 12,
        popoverClass: 'gs-driver-popover',
        // Allow the user to keep typing into highlighted inputs during the tour.
        disableActiveInteraction: false,
        onHighlightStarted: (_element, _step, opts) => {
          const idx = opts.state.activeIndex ?? 0;
          lastStepIndexRef.current = idx;
          const activeStep = opts.state.activeStep;
          const elSelector =
            typeof activeStep?.element === 'string' ? activeStep.element : null;
          emitTourEvent('step-changed', {
            stepIndex: idx,
            anchorId: elSelector,
            mode,
          });
        },
        onDestroyStarted: (_element, _step, opts) => {
          // driver.js requires us to call destroy() ourselves from this hook
          // when allowClose is true. We use this point to classify
          // completed vs dismissed.
          const idx = opts.state.activeIndex ?? 0;
          const total = steps.length;
          const isComplete = idx >= total - 1;
          completedRef.current = isComplete;
          opts.driver.destroy();
        },
        onDestroyed: () => {
          const completed = completedRef.current;
          // Persist "seen" unless the caller asked for an ephemeral run.
          if (!options.ephemeral) {
            markTourSeen(mode);
          }
          emitTourEvent(completed ? 'completed' : 'dismissed', {
            stepIndex: lastStepIndexRef.current,
            mode,
          });
          driverInstanceRef.current = null;
        },
      }) as unknown as Driver;

      driverInstanceRef.current = instance;
      emitTourEvent('started', { mode });
      instance.drive(0);
    },
    [cleanup, hasRepositories, isDemoMode],
  );

  const stopTour = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const isActive = useCallback(() => {
    return driverInstanceRef.current?.isActive() ?? false;
  }, []);

  return { startTour, stopTour, isActive };
}
