'use client';

import { AlertTriangle, Clock, Inbox, Lock, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/primitives';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'inbox' | 'error' | 'offline' | 'rate-limit' | 'auth';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  inbox: Inbox,
  error: AlertTriangle,
  offline: WifiOff,
  'rate-limit': Clock,
  auth: Lock,
} as const;

export function EmptyState({ title, description, icon = 'inbox', action }: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <div
      className="rounded-[12px] border p-8 text-center sm:p-10 [box-shadow:inset_0_1px_0_oklch(1_0_0/0.04)]"
      style={{
        background: 'var(--gs-bg-1)',
        borderColor: 'var(--gs-border-default)',
      }}
    >
      <div className="flex justify-center">
        <div
          className="inline-flex h-11 w-11 items-center justify-center rounded-md"
          style={{
            background: 'var(--gs-bg-2)',
            color: 'var(--gs-fg-2)',
          }}
        >
          <IconComponent size={20} strokeWidth={1.75} />
        </div>
      </div>
      <h3
        className="mt-4 text-[16px] font-medium tracking-[-0.01em]"
        style={{ color: 'var(--gs-fg-0)' }}
      >
        {title}
      </h3>
      <p
        className="mx-auto mt-1.5 max-w-md text-[13px] leading-[1.55]"
        style={{ color: 'var(--gs-fg-2)' }}
      >
        {description}
      </p>
      {action ? (
        <div className="mt-5">
          <Button
            variant="primary"
            size="sm"
            onClick={action.onClick}
            iconLeft={<RefreshCw size={13} />}
          >
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function classifyError(message: string): {
  icon: EmptyStateProps['icon'];
  title: string;
  description: string;
} {
  const lower = message.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      icon: 'offline',
      title: 'You appear to be offline',
      description: 'GitSense cannot reach the network. Reconnect and retry — your workspace state is preserved.',
    };
  }

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many')) {
    return {
      icon: 'rate-limit',
      title: 'GitHub rate limit reached',
      description: 'GitHub is temporarily throttling requests. GitSense will resume automatically — retry in a few minutes.',
    };
  }

  if (
    lower.includes('unauthorized')
    || lower.includes('401')
    || lower.includes('forbidden')
    || lower.includes('403')
    || lower.includes('expired')
    || lower.includes('session')
  ) {
    return {
      icon: 'auth',
      title: 'Session needs attention',
      description: 'Your session may have expired or lacks permission for this action. Sign in again to continue.',
    };
  }

  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return {
      icon: 'offline',
      title: 'Network error',
      description: 'The request could not reach the GitSense backend. Check your connection and retry.',
    };
  }

  return {
    icon: 'error',
    title: 'Something went wrong',
    description: message || 'We encountered an error loading your workspace. Please try again.',
  };
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const classified = description ? classifyError(description) : null;

  return (
    <EmptyState
      title={title ?? classified?.title ?? 'Something went wrong'}
      description={description ?? classified?.description ?? 'We encountered an error loading your dashboard. Please try again.'}
      icon={classified?.icon ?? 'error'}
      action={{
        label: 'Retry',
        onClick: onRetry ?? (() => window.location.reload()),
      }}
    />
  );
}

export function NoDataState() {
  return (
    <EmptyState
      title="No issues found"
      description="There are no issues matching your current filters. Try adjusting the repository, state, or sort options."
      icon="inbox"
    />
  );
}
