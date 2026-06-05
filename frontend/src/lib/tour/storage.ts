/**
 * Persistence layer for the in-app product tour and version tracking.
 *
 * All keys are namespaced under `gitsense:` to stay consistent with the
 * project's existing window-event naming (see `gitsense:refresh-issues`).
 *
 * Functions are SSR-safe: they return null / no-op when `window` is absent.
 */

const TOUR_KEY = 'gitsense:tour:v1';
const TOUR_DEMO_KEY = 'gitsense:tour:v1:demo';
const LAST_SEEN_VERSION_KEY = 'gitsense:last-seen-version';

export type TourMode = 'default' | 'demo';

type TourRecord = {
  seenAt: number;
  version: 1;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function keyFor(mode: TourMode): string {
  return mode === 'demo' ? TOUR_DEMO_KEY : TOUR_KEY;
}

export function hasSeenTour(mode: TourMode = 'default'): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = window.localStorage.getItem(keyFor(mode));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<TourRecord>;
    return parsed?.version === 1 && typeof parsed.seenAt === 'number';
  } catch {
    return false;
  }
}

export function markTourSeen(mode: TourMode = 'default'): void {
  if (!isBrowser()) return;
  try {
    const record: TourRecord = { seenAt: Date.now(), version: 1 };
    window.localStorage.setItem(keyFor(mode), JSON.stringify(record));
  } catch {
    // Silent — localStorage may be unavailable (privacy modes, quota errors).
  }
}

export function clearTourState(mode: TourMode = 'default'): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(keyFor(mode));
  } catch {
    // Silent.
  }
}

/**
 * Last app version the user explicitly acknowledged. Reserved for a future
 * "What's New" Help menu item that compares against
 * `process.env.NEXT_PUBLIC_APP_VERSION`. The UI surface is intentionally not
 * shipped in v1.0 — only the storage layer is, so the helper exists when
 * release notes are ready.
 */
export function getLastSeenVersion(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenVersion(version: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
  } catch {
    // Silent.
  }
}

export function getCurrentAppVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
}
