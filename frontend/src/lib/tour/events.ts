/**
 * Tour lifecycle window events.
 *
 * Uses the same `gitsense:` namespace as the existing
 * `gitsense:refresh-issues` event consumed by `dashboard-client.tsx`.
 *
 * Listeners can attach via:
 *   window.addEventListener('gitsense:tour-completed', handler)
 *
 * No analytics, no backend — these are local hooks so future telemetry
 * (e.g. "where do users drop off?") can be wired in without changing the
 * tour engine itself.
 */

export type TourEventName =
  | 'started'
  | 'step-changed'
  | 'completed'
  | 'dismissed';

export type TourEventDetail = {
  stepIndex?: number;
  anchorId?: string | null;
  mode?: 'default' | 'demo';
};

export function emitTourEvent(
  name: TourEventName,
  detail: TourEventDetail = {},
): void {
  if (typeof window === 'undefined') return;
  const eventName = `gitsense:tour-${name}`;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
