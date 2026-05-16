'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Check,
  Download,
  FileArchive,
  FileJson,
  FileText,
  Loader2,
  Table,
} from 'lucide-react';
import { TopbarActionButton } from '@/components/topbar/topbar-action-button';
import {
  buildExportFilename,
  buildExportPayload,
  loadWorkspaceSnapshot,
  type WorkspaceSnapshot,
} from '@/lib/topbar-workspace';
import { pushLocalNotification } from '@/lib/notifications-bus';
import type { OwnershipHeaders } from '@/lib/issues';

type ExportPanelProps = {
  ownership: OwnershipHeaders;
  route: string;
  onStatus: (message: string) => void;
};

type ExportFormat = 'csv' | 'json' | 'markdown' | 'pdf';

const exportOptions: Array<{
  id: ExportFormat;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}> = [
  {
    id: 'csv',
    title: 'Issue analytics (CSV)',
    description: 'Spreadsheet-ready issue activity. Formula-injection safe.',
    icon: <Table size={16} />,
  },
  {
    id: 'json',
    title: 'Workspace data (JSON)',
    description: 'Repositories, issue activity, and analytics metadata.',
    icon: <FileJson size={16} />,
  },
  {
    id: 'markdown',
    title: 'Workspace report (Markdown)',
    description: 'Human-readable report with metrics and stale issue warnings.',
    icon: <FileText size={16} />,
  },
  {
    id: 'pdf',
    title: 'Dashboard snapshot (PDF)',
    description: 'Rendered dashboard snapshot — not enabled yet.',
    icon: <FileArchive size={16} />,
    disabled: true,
  },
];

export function ExportPanel({ ownership, route, onStatus }: ExportPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null);
  const [completedFormat, setCompletedFormat] = useState<ExportFormat | null>(null);
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

        setError(loadError instanceof Error ? loadError.message : 'Unable to prepare export.');
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

  async function runExport(format: ExportFormat) {
    if (format === 'pdf') {
      onStatus('PDF export is not enabled yet');
      return;
    }

    setActiveFormat(format);
    setCompletedFormat(null);
    setError(null);

    try {
      const exportSnapshot = snapshot ?? await loadWorkspaceSnapshot(ownership, route);
      setSnapshot(exportSnapshot);
      const payload = buildExportPayload(exportSnapshot, format);
      const filename = buildExportFilename(format);
      downloadTextFile(payload, filename, contentTypeFor(format));
      setCompletedFormat(format);
      onStatus(`Exported ${filename}`);

      pushLocalNotification({
        kind: 'export_completed',
        title: 'Workspace export completed',
        description: `${filename} generated with sanitized workspace data.`,
        href: '/dashboard',
        severity: 'success',
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unable to export workspace.');
      onStatus('Export failed');
    } finally {
      setActiveFormat(null);
    }
  }

  return (
    <div className="relative">
      <TopbarActionButton
        label="Open export panel"
        title="Export"
        icon={<Download size={16} />}
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close export panel"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent sm:hidden"
          />
          <div className="absolute right-0 top-11 z-50 w-[min(92vw,420px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover/95 text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-b border-border/80 bg-gradient-to-r from-primary/10 via-transparent to-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <BarChart3 size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export workspace</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Sanitized exports of issue analytics, repository stats, and workspace summaries.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3">
            {isLoading && (
              <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                <Loader2 size={14} className="mr-2 inline animate-spin" />
                Preparing export snapshot
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {exportOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={activeFormat === option.id}
                onClick={() => void runExport(option.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-smooth hover:-translate-y-0.5 ${
                  option.disabled
                    ? 'border-border/60 bg-background/25 opacity-60'
                    : 'border-border bg-background/35 hover:border-primary/30 hover:bg-secondary/35'
                }`}
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  {activeFormat === option.id ? <Loader2 size={16} className="animate-spin" /> : completedFormat === option.id ? <Check size={16} /> : option.icon}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
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

function downloadTextFile(payload: string, filename: string, type: string) {
  const blob = new Blob([payload], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function contentTypeFor(format: Exclude<ExportFormat, 'pdf'>) {
  if (format === 'json') {
    return 'application/json';
  }

  if (format === 'csv') {
    return 'text/csv';
  }

  return 'text/markdown';
}
