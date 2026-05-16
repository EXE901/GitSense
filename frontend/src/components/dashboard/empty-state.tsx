'use client';

import { AlertTriangle, Inbox, RefreshCw, WifiOff, Lock, Clock } from 'lucide-react';

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
    <div className="bg-card border border-border rounded-xl p-8 sm:p-12 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-secondary/60 rounded-lg text-muted-foreground">
          <IconComponent size={32} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 smooth-transition"
        >
          <RefreshCw size={16} />
          {action.label}
        </button>
      )}
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
      description="There are no issues matching your current filters. Try adjusting your search criteria."
      icon="inbox"
    />
  );
}
