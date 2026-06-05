/**
 * Single source of truth for global keyboard shortcuts.
 *
 * The registry is pure data so the same definitions can drive both the
 * runtime listener (`use-keyboard-shortcuts`) and the documentation UI
 * (`keyboard-shortcuts-dialog`). No React, no DOM, no side effects.
 */

export type ShortcutScope = 'global' | 'navigation';

export type ShortcutKind = 'single' | 'sequence';

export type ShortcutDefinition = {
  id: string;
  /** Keys to display in the UI, e.g. ['?'] or ['g', 'd']. */
  displayKeys: string[];
  /** Logical key matcher (lowercased printable, or named key like 'Escape'). */
  match: string[];
  kind: ShortcutKind;
  scope: ShortcutScope;
  label: string;
  description: string;
  /** When true, the shortcut still fires while focus is inside an input. */
  worksInInputs?: boolean;
};

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'open-help',
    displayKeys: ['?'],
    match: ['?'],
    kind: 'single',
    scope: 'global',
    label: 'Open Help Center',
    description: 'Open the Help menu in the bottom-right corner.',
  },
  {
    id: 'focus-search',
    displayKeys: ['/'],
    match: ['/'],
    kind: 'single',
    scope: 'global',
    label: 'Focus repository search',
    description: 'Jump to the repository search input on the dashboard.',
  },
  {
    id: 'close',
    displayKeys: ['Esc'],
    match: ['Escape'],
    kind: 'single',
    scope: 'global',
    label: 'Close dialog or tour',
    description: 'Close the active product tour, dialog, or popover.',
    worksInInputs: true,
  },
  {
    id: 'go-dashboard',
    displayKeys: ['g', 'd'],
    match: ['g', 'd'],
    kind: 'sequence',
    scope: 'navigation',
    label: 'Go to Dashboard',
    description: 'Navigate to the dashboard view.',
  },
  {
    id: 'go-repositories',
    displayKeys: ['g', 'r'],
    match: ['g', 'r'],
    kind: 'sequence',
    scope: 'navigation',
    label: 'Go to Repositories',
    description: 'Navigate to the repository search view.',
  },
];

export const SEQUENCE_TIMEOUT_MS = 1200;

export function groupByScope(): Record<ShortcutScope, ShortcutDefinition[]> {
  return SHORTCUTS.reduce<Record<ShortcutScope, ShortcutDefinition[]>>(
    (acc, shortcut) => {
      acc[shortcut.scope] = acc[shortcut.scope] ?? [];
      acc[shortcut.scope].push(shortcut);
      return acc;
    },
    { global: [], navigation: [] },
  );
}
