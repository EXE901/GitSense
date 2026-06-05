'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  SEQUENCE_TIMEOUT_MS,
  SHORTCUTS,
  type ShortcutDefinition,
} from '@/lib/shortcuts/registry';

type Handlers = {
  /** Called for the `?` shortcut to surface the Help menu. */
  onOpenHelp: () => void;
  /** Called for the `Escape` shortcut to close active dialogs. */
  onCloseAll: () => void;
};

const REPO_SEARCH_INPUT_ID = 'gs-repo-search-input';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Global keyboard shortcuts. Mounted once at the (app) layout level so the
 * listener is only active inside the authenticated/demo app shell.
 *
 * Single-key shortcuts (`?`, `/`, `Esc`) match on the first matching key.
 * Sequence shortcuts (`g d`, `g r`) buffer for SEQUENCE_TIMEOUT_MS then reset.
 *
 * Inputs are skipped except for `Escape` (so users can dismiss tours mid-typing).
 */
export function useKeyboardShortcuts(handlers: Handlers) {
  const router = useRouter();
  // Keep handler refs stable so we don't re-bind the listener on every render.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const sequenceBuffer: string[] = [];
    let sequenceTimer: number | null = null;

    function resetSequence() {
      sequenceBuffer.length = 0;
      if (sequenceTimer !== null) {
        window.clearTimeout(sequenceTimer);
        sequenceTimer = null;
      }
    }

    function fire(shortcut: ShortcutDefinition) {
      resetSequence();
      switch (shortcut.id) {
        case 'open-help':
          handlersRef.current.onOpenHelp();
          break;
        case 'focus-search': {
          // The dashboard renders separate mobile / desktop FilterBar branches
          // that share the same id. Prefer the currently visible input so the
          // shortcut works regardless of breakpoint.
          const inputs = document.querySelectorAll<HTMLInputElement>(
            `#${REPO_SEARCH_INPUT_ID}`,
          );
          let target: HTMLInputElement | null = null;
          inputs.forEach((node) => {
            if (target) return;
            if (typeof node.checkVisibility === 'function') {
              if (node.checkVisibility()) target = node;
            } else if (node.getBoundingClientRect().width > 0) {
              target = node;
            }
          });
          if (target) {
            (target as HTMLInputElement).focus();
            (target as HTMLInputElement).select();
          } else {
            router.push('/dashboard');
          }
          break;
        }
        case 'close':
          handlersRef.current.onCloseAll();
          break;
        case 'go-dashboard':
          router.push('/dashboard');
          break;
        case 'go-repositories':
          router.push('/repositories');
          break;
        default:
          break;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Don't interfere with composition (IME) input.
      if (event.isComposing) return;
      // Don't capture browser shortcuts.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const isInInput = isEditableTarget(event.target);
      const key = event.key;
      const lowered = key.length === 1 ? key.toLowerCase() : key;

      // 1) Single-key shortcuts.
      for (const shortcut of SHORTCUTS) {
        if (shortcut.kind !== 'single') continue;
        if (!shortcut.worksInInputs && isInInput) continue;
        const matches = shortcut.match.some((target) =>
          target === key || target === lowered,
        );
        if (matches) {
          event.preventDefault();
          fire(shortcut);
          return;
        }
      }

      // Sequence shortcuts: skip when typing into inputs.
      if (isInInput) return;

      // Only letters participate in sequences (per current registry).
      if (lowered.length !== 1 || !/[a-z]/.test(lowered)) {
        resetSequence();
        return;
      }

      sequenceBuffer.push(lowered);
      if (sequenceTimer !== null) window.clearTimeout(sequenceTimer);
      sequenceTimer = window.setTimeout(resetSequence, SEQUENCE_TIMEOUT_MS);

      // Try to match a sequence against the tail of the buffer.
      for (const shortcut of SHORTCUTS) {
        if (shortcut.kind !== 'sequence') continue;
        const len = shortcut.match.length;
        if (sequenceBuffer.length < len) continue;
        const tail = sequenceBuffer.slice(-len);
        const matches = tail.every((char, i) => char === shortcut.match[i]);
        if (matches) {
          event.preventDefault();
          fire(shortcut);
          return;
        }
      }

      // Trim buffer to a reasonable max so it doesn't grow unbounded.
      if (sequenceBuffer.length > 8) sequenceBuffer.splice(0, sequenceBuffer.length - 8);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, [router]);
}
