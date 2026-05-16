'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, GitPullRequestArrow, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import {
  fetchAuthenticatedGitHubActivity,
  type AuthenticatedGitHubActivity,
} from '@/lib/analytics';

type DeveloperActivityPanelProps = {
  token: string | null;
  refreshTrigger?: number;
};

const metricLabels = [
  { key: 'opened_issues', label: 'Opened' },
  { key: 'closed_issues', label: 'Closed' },
  { key: 'assigned_issues', label: 'Assigned' },
  { key: 'participated_issues', label: 'Participated' },
] as const;

export function DeveloperActivityPanel({ token, refreshTrigger }: DeveloperActivityPanelProps) {
  const [activity, setActivity] = useState<AuthenticatedGitHubActivity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const activeToken = token;
    const controller = new AbortController();

    async function loadActivity() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await fetchAuthenticatedGitHubActivity(activeToken, controller.signal);
        setActivity(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load GitHub contribution activity.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadActivity();

    return () => controller.abort();
  }, [refreshTrigger, token]);

  if (!token) {
    return null;
  }

  if (isLoading && !activity) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin text-primary" />
          Loading authenticated GitHub activity
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-200">
        {errorMessage}
      </section>
    );
  }

  if (!activity) {
    return null;
  }

  if (!activity.linked) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Developer Activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">{activity.message}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <UserRound size={15} />
            GitHub not linked
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {activity.profile?.avatar_url ? (
            <Image
              unoptimized
              src={activity.profile.avatar_url}
              alt={`${activity.profile.username} GitHub avatar`}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border border-border bg-secondary object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground">
              <UserRound size={18} />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold text-foreground">Authenticated GitHub Activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {activity.profile?.username ? `Live public issue activity for @${activity.profile.username}` : activity.message}
            </p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-700 dark:text-green-300">
          <ShieldCheck size={14} />
          {activity.authenticated_api ? 'GitHub API token active' : 'Public GitHub API'}
        </div>
      </div>

      {!activity.available && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          {activity.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metricLabels.map((metric) => (
          <div key={metric.key} className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {activity.metrics[metric.key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-background/30 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Repositories participated in
          </h3>
          {activity.repositories.length > 0 ? (
            <div className="space-y-2">
              {activity.repositories.slice(0, 5).map((repository) => (
                <div key={repository.repository} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-foreground">{repository.repository}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {repository.recent_activity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent repository activity found.</p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-background/30 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent issue activity
          </h3>
          {activity.recent_activity.length > 0 ? (
            <div className="space-y-2">
              {activity.recent_activity.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-smooth hover:bg-secondary/50"
                >
                  <GitPullRequestArrow size={15} className="mt-0.5 flex-shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.repository} #{item.number} · {item.state}
                    </span>
                  </span>
                  <ArrowUpRight size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent issue activity found.</p>
          )}
        </div>
      </div>
    </section>
  );
}
