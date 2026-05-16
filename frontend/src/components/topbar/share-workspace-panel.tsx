'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  FileText,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react';
import { TopbarActionButton } from '@/components/topbar/topbar-action-button';
import {
  buildWorkspaceSummary,
  loadWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from '@/lib/topbar-workspace';
import {
  buildSafeShareUrl,
  sanitizeMarkdown,
} from '@/lib/share-safety';
import type { OwnershipHeaders } from '@/lib/issues';

type ShareWorkspacePanelProps = {
  ownership: OwnershipHeaders;
  route: string;
  onStatus: (message: string) => void;
};

type ShareAction = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  action: () => Promise<string>;
};

export function ShareWorkspacePanel({ ownership, route, onStatus }: ShareWorkspacePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || snapshot) {
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });

    loadWorkspaceSnapshot(ownership, route, controller.signal)
      .then((nextSnapshot) => setSnapshot(nextSnapshot))
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to prepare share payload.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [isOpen, ownership, route, snapshot]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const shareActions = useMemo<ShareAction[]>(() => {
    const currentUrl = typeof window === 'undefined' ? '' : window.location.href;

    return [
      {
        id: 'copy-link',
        title: 'Copy workspace link',
        description: 'Current view URL, sanitized — query parameters limited to safe workspace state.',
        icon: <Link2 size={16} />,
        action: async () => {
          await copyToClipboard(buildSafeShareUrl(currentUrl));
          return 'Workspace link copied';
        },
      },
      {
        id: 'temporary-link',
        title: 'Generate preview link',
        description: 'Read-only preview URL. Not a signed access token and does not bypass authentication.',
        icon: <Share2 size={16} />,
        action: async () => {
          await copyToClipboard(buildSafeShareUrl(currentUrl, { share_preview: 'true' }));
          return 'Preview link copied';
        },
      },
      {
        id: 'repository-analytics',
        title: 'Share analytics route',
        description: 'Direct link to the analytics view for repository and workspace metrics.',
        icon: <Clipboard size={16} />,
        action: async () => {
          const url = new URL('/analytics', window.location.origin);
          await copyToClipboard(buildSafeShareUrl(url.toString()));
          return 'Analytics route copied';
        },
      },
      {
        id: 'insight-card',
        title: 'Copy insight card',
        description: 'Markdown-ready intelligence card with top workspace metrics.',
        icon: <Sparkles size={16} />,
        action: async () => {
          if (!snapshot) {
            throw new Error('Workspace snapshot is still loading.');
          }

          await copyToClipboard(buildInsightCard(snapshot));
          return 'Insight card copied';
        },
      },
      {
        id: 'workspace-summary',
        title: 'Copy workspace summary',
        description: 'Compact summary of issue activity and tracked repositories.',
        icon: <FileText size={16} />,
        action: async () => {
          if (!snapshot) {
            throw new Error('Workspace snapshot is still loading.');
          }

          await copyToClipboard(buildWorkspaceSummary(snapshot));
          return 'Workspace summary copied';
        },
      },
      {
        id: 'team-collaboration',
        title: 'Team collaboration',
        description: 'Reserved for team workspaces and public intelligence pages — not enabled yet.',
        icon: <Users size={16} />,
        disabled: true,
        action: async () => 'Team collaboration requires workspace sharing backend support.',
      },
    ];
  }, [snapshot]);

  async function runAction(action: ShareAction) {
    if (action.disabled) {
      onStatus('Team sharing is not enabled yet');
      return;
    }

    setActiveAction(action.id);
    setError(null);
    setCopiedAction(null);

    try {
      const message = await action.action();
      setCopiedAction(action.id);
      onStatus(message);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : 'Unable to share workspace.');
      onStatus('Share failed');
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="relative">
      <TopbarActionButton
        label="Open share workspace panel"
        title="Share Workspace"
        icon={<Share2 size={16} />}
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close share workspace panel"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent sm:hidden"
          />
          <div className="absolute right-0 top-11 z-50 w-[min(92vw,440px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover/95 text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-border/80 bg-gradient-to-r from-cyan-400/10 via-transparent to-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">Share workspace</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Generate safe links, insight cards, and workspace summaries. Tokens and session data are stripped automatically.
            </p>
          </div>

          <div className="space-y-3 p-3">
            {isLoading && (
              <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                <Loader2 size={14} className="mr-2 inline animate-spin" />
                Preparing workspace snapshot
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {shareActions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={activeAction === action.id}
                onClick={() => void runAction(action)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-smooth hover:-translate-y-0.5 ${
                  action.disabled
                    ? 'border-border/60 bg-background/25 opacity-60'
                    : 'border-border bg-background/35 hover:border-primary/30 hover:bg-secondary/35'
                }`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  {activeAction === action.id ? <Loader2 size={16} className="animate-spin" /> : copiedAction === action.id ? <Check size={16} /> : action.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">{action.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{action.description}</span>
                </span>
              </button>
            ))}
          </div>
          </div>
        </>
      )}
    </div>
  );
}

function buildInsightCard(snapshot: WorkspaceSnapshot) {
  const overview = snapshot.overview;

  return [
    '## GitSense Insight Card',
    '',
    `- Repositories tracked: ${overview?.repositories_tracked ?? snapshot.repositories.length}`,
    `- Open issues: ${overview?.open_issues ?? 0}`,
    `- Closed issues: ${overview?.closed_issues ?? 0}`,
    `- Stale warnings: ${overview?.stale_issues_count ?? snapshot.staleIssues.length}`,
    `- Generated: ${sanitizeMarkdown(new Date(snapshot.generatedAt).toLocaleString())}`,
  ].join('\n');
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
      throw new Error('Clipboard access was blocked by the browser.');
    }
  }
}
