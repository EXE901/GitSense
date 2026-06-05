'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Kbd } from '@/components/primitives';
import { groupByScope, type ShortcutDefinition } from '@/lib/shortcuts/registry';

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const SCOPE_LABELS: Record<'global' | 'navigation', string> = {
  global: 'Global',
  navigation: 'Navigation',
};

/**
 * Modal listing all keyboard shortcuts from the central registry.
 *
 * - role="dialog" + aria-modal so screen readers announce it correctly.
 * - Esc closes the dialog (intercepted before the global Esc handler).
 * - Click on the backdrop closes the dialog.
 * - Focus moves to the close button on open; previously focused element is
 *   restored on close.
 */
export function KeyboardShortcutsDialog({
  open,
  onClose,
}: KeyboardShortcutsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Defer focus to next paint so the element exists in the tree.
    const id = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      // Restore focus to the trigger.
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const grouped = groupByScope();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gs-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close keyboard shortcuts"
        className="absolute inset-0 cursor-default"
        style={{
          background:
            'color-mix(in oklch, var(--gs-bg-0) 70%, transparent)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-[14px] border p-5 shadow-[var(--shadow-3)]"
        style={{
          background: 'var(--gs-bg-1)',
          borderColor: 'var(--gs-border-default)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="gs-shortcuts-title"
              className="text-[15px] font-semibold leading-snug tracking-[-0.01em]"
              style={{ color: 'var(--gs-fg-0)' }}
            >
              Keyboard shortcuts
            </h2>
            <p
              className="mt-1 text-[12px]"
              style={{ color: 'var(--gs-fg-2)' }}
            >
              Move through GitSense faster from the keyboard.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 transition-colors hover:bg-[color:var(--gs-bg-2)]"
            style={{ color: 'var(--gs-fg-1)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {(Object.keys(grouped) as ('global' | 'navigation')[]).map((scope) => {
            const items = grouped[scope];
            if (!items?.length) return null;
            return (
              <section key={scope}>
                <h3
                  className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--gs-fg-2)' }}
                >
                  {SCOPE_LABELS[scope]}
                </h3>
                <ul className="space-y-1.5">
                  {items.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
  return (
    <li
      className="flex items-center justify-between gap-3 rounded-[8px] px-2.5 py-1.5"
      style={{
        background:
          'color-mix(in oklch, var(--gs-bg-2) 50%, transparent)',
      }}
    >
      <span
        className="min-w-0 truncate text-[12.5px]"
        style={{ color: 'var(--gs-fg-1)' }}
        title={shortcut.description}
      >
        {shortcut.label}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {shortcut.displayKeys.map((key, index) => (
          <span key={`${shortcut.id}-${index}`} className="flex items-center gap-1">
            <Kbd>{key}</Kbd>
            {index < shortcut.displayKeys.length - 1 ? (
              <span
                aria-hidden="true"
                className="text-[11px]"
                style={{ color: 'var(--gs-fg-3)' }}
              >
                then
              </span>
            ) : null}
          </span>
        ))}
      </span>
    </li>
  );
}
