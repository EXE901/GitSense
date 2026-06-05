'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  HelpCircle,
  KeyRound,
  PlayCircle,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { useProductTour } from '@/hooks/use-product-tour';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { KeyboardShortcutsDialog } from '@/components/tour/keyboard-shortcuts-dialog';

const GITHUB_REPO_URL = process.env.NEXT_PUBLIC_GITHUB_REPO_URL ?? '';
const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? '';

type HelpMenuProps = {
  /**
   * Hint from a parent route that the user has at least one repository
   * connected. When unknown (e.g. on non-dashboard routes) the tour will
   * fall through to the full-step variant, which is correct for any logged-in
   * user re-opening the tour from the Help menu.
   */
  hasRepositories?: boolean;
};

/**
 * Persistent bottom-right Help menu mounted by the (app) layout.
 *
 * Owns:
 *   - the floating "?" trigger
 *   - the popover menu (Tour / Shortcuts / GitHub / Docs)
 *   - the Keyboard Shortcuts dialog
 *   - the global keyboard listener (so `?` and `Esc` route through here)
 */
export function HelpMenu({ hasRepositories = false }: HelpMenuProps) {
  const { status } = useAuth();
  const searchParams = useSearchParams();
  const isDemoMode =
    searchParams.get('demo') === '1' && status !== 'authenticated';

  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const { startTour, stopTour, isActive } = useProductTour({
    isDemoMode,
    hasRepositories,
  });

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const closeAll = useCallback(() => {
    // Priority: active tour > shortcuts dialog > menu popover.
    if (isActive()) {
      stopTour();
      return;
    }
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (menuOpen) {
      closeMenu();
    }
  }, [closeMenu, isActive, menuOpen, shortcutsOpen, stopTour]);

  useKeyboardShortcuts({
    onOpenHelp: openMenu,
    onCloseAll: closeAll,
  });

  // Close menu on click outside.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen, closeMenu]);

  // Close menu on Escape (independent of the global shortcut so the menu
  // closes even when focus is inside the menu itself).
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  const handleStartTour = useCallback(() => {
    closeMenu();
    // ephemeral: re-runs from Help menu should not flip the "seen" flag again
    // (it's already set after the first surface), but we set it anyway for
    // consistency. Either choice is fine; we go with "mark seen" so the
    // banner stays dismissed.
    void startTour();
  }, [closeMenu, startTour]);

  const handleOpenShortcuts = useCallback(() => {
    closeMenu();
    setShortcutsOpen(true);
  }, [closeMenu]);

  const showGithub = Boolean(GITHUB_REPO_URL);
  const showDocs = Boolean(DOCS_URL);
  const hasExternalSection = showGithub || showDocs;

  return (
    <>
      <div
        className="pointer-events-none fixed right-4 z-40"
        style={{
          bottom:
            'calc(env(safe-area-inset-bottom, 0px) + var(--gs-bottom-nav-height, 0px) + 16px)',
        }}
      >
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {menuOpen ? (
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Help menu"
              className="w-56 overflow-hidden rounded-[12px] border shadow-[var(--shadow-2)]"
              style={{
                background: 'var(--gs-bg-1)',
                borderColor: 'var(--gs-border-default)',
              }}
            >
              <ul className="py-1">
                <MenuItem
                  icon={<PlayCircle size={14} />}
                  label="Start product tour"
                  onClick={handleStartTour}
                />
                <MenuItem
                  icon={<KeyRound size={14} />}
                  label="Keyboard shortcuts"
                  onClick={handleOpenShortcuts}
                />
                {hasExternalSection ? (
                  <li
                    role="separator"
                    aria-orientation="horizontal"
                    className="my-1 mx-2 h-px"
                    style={{ background: 'var(--gs-border-subtle)' }}
                  />
                ) : null}
                {showGithub ? (
                  <MenuLink
                    icon={<ExternalLink size={14} />}
                    label="GitHub repository"
                    href={GITHUB_REPO_URL}
                    onActivate={closeMenu}
                  />
                ) : null}
                {showDocs ? (
                  <MenuLink
                    icon={<ExternalLink size={14} />}
                    label="Documentation"
                    href={DOCS_URL}
                    onActivate={closeMenu}
                  />
                ) : null}
              </ul>
            </div>
          ) : null}

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            aria-label="Open help menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,box-shadow,border-color,color] ease-[var(--ease-standard)] duration-[var(--dur-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gs-accent-primary)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--gs-bg-0)] hover:bg-[color:var(--gs-bg-2)] sm:h-11 sm:w-auto sm:gap-1.5 sm:px-3.5"
            style={{
              background: 'var(--gs-bg-1)',
              borderColor: 'var(--gs-border-default)',
              color: 'var(--gs-fg-0)',
            }}
          >
            <HelpCircle size={16} />
            <span className="hidden text-[13px] font-medium sm:inline">Help</span>
          </button>
        </div>
      </div>

      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[color:var(--gs-bg-2)] focus:bg-[color:var(--gs-bg-2)] focus:outline-none"
        style={{ color: 'var(--gs-fg-0)' }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          {icon}
        </span>
        {label}
      </button>
    </li>
  );
}

function MenuLink({
  icon,
  label,
  href,
  onActivate,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onActivate: () => void;
}) {
  return (
    <li>
      <a
        role="menuitem"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onActivate}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[color:var(--gs-bg-2)] focus:bg-[color:var(--gs-bg-2)] focus:outline-none"
        style={{ color: 'var(--gs-fg-0)' }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          {icon}
        </span>
        {label}
      </a>
    </li>
  );
}
