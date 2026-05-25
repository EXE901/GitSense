/**
 * cn — minimal className combiner.
 * Filters out falsy values; no external deps.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
