'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/primitives';

function GitHubMark({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.17a11.1 11.1 0 0 1 5.79 0c2.21-1.48 3.18-1.17 3.18-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.13 0 1.54-.01 2.79-.01 3.17 0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function OAuthButtons() {
  const { startProviderLogin } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'github' | 'google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleProvider(provider: 'github' | 'google') {
    setLoadingProvider(provider);
    setMessage(null);
    try {
      const providerMessage = await startProviderLogin(provider);
      setMessage(providerMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'OAuth sign-in is not available yet.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <Button
        type="button"
        variant="primary"
        size="md"
        glow
        onClick={() => handleProvider('github')}
        disabled={loadingProvider !== null}
        className="w-full"
        iconLeft={
          loadingProvider === 'github' ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <GitHubMark size={15} />
          )
        }
      >
        Continue with GitHub
      </Button>
      <Button
        type="button"
        variant="outline"
        size="md"
        onClick={() => handleProvider('google')}
        disabled={loadingProvider !== null}
        className="w-full"
        iconLeft={
          loadingProvider === 'google' ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Mail size={15} />
          )
        }
      >
        Continue with Google
      </Button>
      {message ? (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-[12px]"
          style={{
            background: 'var(--gs-accent-soft)',
            borderColor:
              'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
            color: 'var(--gs-accent-primary)',
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
