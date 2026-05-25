'use client';

import Link from 'next/link';
import { Button, Eyebrow } from '@/components/primitives';

export function VerificationWarningBanner() {
  return (
    <section
      className="rounded-[12px] border p-4"
      style={{
        background: 'color-mix(in oklch, var(--gs-state-warning) 10%, transparent)',
        borderColor:
          'color-mix(in oklch, var(--gs-state-warning) 30%, transparent)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: 'var(--gs-state-warning)' }}
          >
            Verify your email to unlock unlimited repository synchronization.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            Unverified accounts can sync 3 repositories per hour while GitSense protects workspace reliability.
          </p>
        </div>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            Review settings
          </Button>
        </Link>
      </div>
    </section>
  );
}

export function DashboardInitializationBanner() {
  return (
    <section
      className="rounded-[12px] border p-4 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor: 'var(--gs-border-default)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: 'var(--gs-fg-0)' }}
          >
            Preparing GitSense workspace
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            Restoring your session, repository context, and workspace analytics.
          </p>
        </div>
        <div
          className="inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1 text-[11px]"
          style={{
            background: 'var(--gs-accent-soft)',
            borderColor:
              'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
            color: 'var(--gs-accent-primary)',
          }}
        >
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: 'var(--gs-accent-primary)' }}
          />
          Hydrating
        </div>
      </div>
    </section>
  );
}

export function RepositoryWorkflowBanner({
  isPreviewMode,
  repository,
  syncStage,
  isSyncing,
  onSync,
}: {
  isPreviewMode: boolean;
  repository: string;
  syncStage: string | null;
  isSyncing: boolean;
  onSync: () => Promise<boolean>;
}) {
  return (
    <section
      className="rounded-[12px] border p-4"
      style={{
        background: 'var(--gs-accent-soft)',
        borderColor:
          'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[13px] font-medium"
            style={{ color: 'var(--gs-accent-primary)' }}
          >
            {isSyncing ? 'Repository sync in progress' : 'Repository preview mode'}
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'var(--gs-fg-1)' }}
          >
            {isSyncing
              ? `${syncStage ?? 'Syncing repository'}${repository ? ` for ${repository}` : ''}.`
              : isPreviewMode
                ? `${repository} is being inspected temporarily. Sync it when you want to save it to your workspace.`
                : syncStage ?? 'Preparing repository synchronization.'}
          </p>
        </div>
        {isPreviewMode ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => void onSync()}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing…' : 'Sync to workspace'}
          </Button>
        ) : (
          <div
            className="inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1 text-[11px]"
            style={{
              background:
                'color-mix(in oklch, var(--gs-bg-0) 60%, transparent)',
              borderColor:
                'color-mix(in oklch, var(--gs-accent-primary) 25%, transparent)',
              color: 'var(--gs-accent-primary)',
            }}
          >
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: 'var(--gs-accent-primary)' }}
            />
            {syncStage ?? 'Syncing'}
          </div>
        )}
      </div>
    </section>
  );
}

export function FirstSyncGuidance({
  username,
  onPick,
}: {
  username: string | null;
  onPick?: (repository: string) => void;
}) {
  const quickPicks = [
    'facebook/react',
    'vercel/next.js',
    'microsoft/typescript',
    'torvalds/linux',
  ];

  // Desktop-only feature list — kept for context but hidden on mobile to
  // keep the first viewport action-first.
  const items: { title: string; detail: string }[] = [
    {
      title: 'Backlog pressure',
      detail: 'Stale open issues, age distribution, and unresolved load per repository.',
    },
    {
      title: 'Throughput trend',
      detail: 'Open vs closed velocity over time, including weeks where throughput slipped.',
    },
    {
      title: 'Contributor concentration',
      detail: 'How much workspace activity sits on a small number of contributors.',
    },
    {
      title: 'Operational risk signals',
      detail: 'Recurring patterns the engine flags as worth watching, with severity history.',
    },
  ];

  return (
    <section
      className="rounded-[12px] border p-3 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)] sm:p-5"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor:
          'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
      }}
    >
      <Eyebrow tone="accent">Get your first briefing</Eyebrow>
      <h3
        className="mt-1.5 text-[14.5px] font-medium leading-snug tracking-[-0.01em] sm:mt-2 sm:text-[17px]"
        style={{ color: 'var(--gs-fg-0)' }}
      >
        {username
          ? `Welcome, @${username}. Pick a repository to start.`
          : 'Pick a repository to start analysis.'}
      </h3>
      <p
        className="mt-1 text-[12px] leading-[1.5] sm:mt-1.5 sm:text-[13px] sm:leading-[1.55]"
        style={{ color: 'var(--gs-fg-2)' }}
      >
        Use the search above, or jump in with one of these:
      </p>

      {onPick ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          {quickPicks.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onPick(name)}
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-[12px]"
              style={{
                background: 'var(--gs-accent-soft)',
                borderColor:
                  'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
                color: 'var(--gs-accent-primary)',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      {/* Desktop-only context list */}
      <ul className="mt-4 hidden gap-2 sm:grid sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-[10px] border p-3"
            style={{
              background:
                'color-mix(in oklch, var(--gs-bg-2) 60%, transparent)',
              borderColor: 'var(--gs-border-subtle)',
            }}
          >
            <p
              className="text-[12px] font-medium"
              style={{ color: 'var(--gs-fg-0)' }}
            >
              {item.title}
            </p>
            <p
              className="mt-1 text-[11px] leading-[1.5]"
              style={{ color: 'var(--gs-fg-2)' }}
            >
              {item.detail}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkspaceModeBanner({
  isDemoMode,
  status,
  user,
  guestSession,
}: {
  isDemoMode: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: { github_username?: string | null; email?: string | null } | null | undefined;
  guestSession:
    | { remaining_repositories: number; repo_limit: number }
    | null
    | undefined;
}) {
  const modeLabel = isDemoMode
    ? 'Live demo'
    : status === 'authenticated'
      ? 'Persistent'
      : 'Guest demo';

  const longDescription = isDemoMode
    ? 'Read-only demo view with seeded notifications and sample analytics. Nothing here is saved to a real account.'
    : status === 'authenticated'
      ? `Signed in as ${user?.github_username ? `@${user.github_username}` : user?.email}. Repository history is saved to your account.`
      : 'Explore GitSense with temporary analytics. Sign up when you are ready to keep long-term history.';

  return (
    <section
      className="rounded-[10px] border p-2.5 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)] sm:rounded-[12px] sm:p-4"
      style={{
        background: isDemoMode ? 'var(--gs-accent-soft)' : 'var(--gs-bg-1)',
        borderColor: isDemoMode
          ? 'color-mix(in oklch, var(--gs-accent-cyan) 35%, transparent)'
          : 'var(--gs-border-default)',
      }}
    >
      {/* Mobile: single dense line. Description hidden, chip + label + CTA inline. */}
      <div className="flex items-center gap-2 sm:hidden">
        {isDemoMode ? (
          <span
            className="inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{
              background:
                'color-mix(in oklch, var(--gs-accent-cyan) 20%, transparent)',
              borderColor:
                'color-mix(in oklch, var(--gs-accent-cyan) 35%, transparent)',
              color: 'var(--gs-accent-cyan)',
            }}
          >
            Demo
          </span>
        ) : null}
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
          <span
            className="shrink-0 text-[13px] font-medium"
            style={{ color: 'var(--gs-fg-0)' }}
          >
            {modeLabel}
          </span>
          {status === 'authenticated' && user?.github_username ? (
            <span
              className="min-w-0 truncate text-[12px] font-normal"
              style={{ color: 'var(--gs-fg-2)' }}
            >
              @{user.github_username}
            </span>
          ) : null}
        </div>
        {isDemoMode ? (
          <Link href="/signup" className="shrink-0">
            <Button variant="primary" size="sm" className="h-8 px-3 text-[12px]">
              Connect
            </Button>
          </Link>
        ) : status !== 'authenticated' && guestSession ? (
          <span
            className="shrink-0 font-mono text-[11px] tabular-nums"
            style={{ color: 'var(--gs-accent-primary)' }}
          >
            {guestSession.remaining_repositories}/{guestSession.repo_limit} left
          </span>
        ) : null}
      </div>

      {/* Tablet / desktop: original two-column layout with full description */}
      <div className="hidden gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--gs-fg-0)' }}>
            {isDemoMode ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background:
                    'color-mix(in oklch, var(--gs-accent-cyan) 20%, transparent)',
                  borderColor:
                    'color-mix(in oklch, var(--gs-accent-cyan) 35%, transparent)',
                  color: 'var(--gs-accent-cyan)',
                }}
              >
                Demo
              </span>
            ) : null}
            {isDemoMode
              ? 'Live demo workspace'
              : status === 'authenticated'
                ? 'Persistent workspace'
                : 'Guest demo workspace'}
          </p>
          <p
            className="mt-1 text-[12px] leading-[1.5]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            {longDescription}
          </p>
        </div>
        {isDemoMode ? (
          <Link href="/signup">
            <Button variant="primary" size="sm">
              Connect your GitHub
            </Button>
          </Link>
        ) : status !== 'authenticated' && guestSession ? (
          <div
            className="flex flex-col gap-2 rounded-[10px] border px-3 py-2 text-[12px] sm:items-end"
            style={{
              background: 'var(--gs-accent-soft)',
              borderColor:
                'color-mix(in oklch, var(--gs-accent-primary) 25%, transparent)',
              color: 'var(--gs-accent-primary)',
            }}
          >
            <span>
              {guestSession.remaining_repositories} of {guestSession.repo_limit} demo repository syncs remaining
            </span>
            {guestSession.remaining_repositories === 0 ? (
              <Link
                href="/signup"
                className="font-medium underline-offset-4 hover:underline"
              >
                Create an account to keep syncing
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
