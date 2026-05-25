'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ProductLogo } from '@/components/branding/product-logo';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/primitives';
import { Reveal, Shimmer } from '@/components/motion';

const STEPS = [
  'Verifying GitHub authorization',
  'Securing your GitSense session',
  'Loading your workspace context',
] as const;

export function GitHubOAuthCallback() {
  const router = useRouter();
  const { completeOAuthLogin } = useAuth();
  const hasStartedCompletion = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (errorMessage) return;
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current < STEPS.length - 1 ? current + 1 : current));
    }, 900);
    return () => window.clearInterval(interval);
  }, [errorMessage]);

  useEffect(() => {
    if (hasStartedCompletion.current) return;
    hasStartedCompletion.current = true;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const oauthError = hashParams.get('error');
    const oauthMessage = hashParams.get('message');
    const redirectPath = hashParams.get('redirect') || '/settings';

    if (oauthError) {
      queueMicrotask(() => setErrorMessage(oauthError));
      return;
    }

    if (!accessToken) {
      if (oauthMessage) {
        window.history.replaceState(null, '', window.location.pathname);
        router.replace(`${redirectPath}?message=${encodeURIComponent(oauthMessage)}`);
        return;
      }
      queueMicrotask(() =>
        setErrorMessage('GitHub did not return an authentication token.')
      );
      return;
    }

    window.history.replaceState(null, '', window.location.pathname);

    completeOAuthLogin(accessToken)
      .then(() => router.replace('/dashboard'))
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to complete GitHub sign-in.'
        );
      });
  }, [completeOAuthLogin, router]);

  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Reveal y={16} duration={420} className="w-full">
        <div
          className="relative rounded-[16px] border p-7 text-center [box-shadow:inset_0_1px_0_oklch(1_0_0/0.05),0_24px_64px_-32px_oklch(0_0_0/0.45)]"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklch, var(--gs-bg-1) 95%, transparent), color-mix(in oklch, var(--gs-bg-1) 80%, transparent))',
            borderColor: 'var(--gs-border-default)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in oklch, var(--gs-accent-primary) 60%, transparent), transparent)',
              opacity: 0.7,
            }}
          />

          <div className="flex justify-center">
            <ProductLogo href="/" size="md" showText={true} />
          </div>

          {errorMessage ? (
            <div className="mt-7 space-y-4">
              <div
                className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-md border"
                style={{
                  background:
                    'color-mix(in oklch, var(--gs-state-danger) 10%, transparent)',
                  borderColor:
                    'color-mix(in oklch, var(--gs-state-danger) 30%, transparent)',
                  color: 'var(--gs-state-danger)',
                }}
              >
                <AlertCircle size={18} />
              </div>
              <div>
                <h1
                  className="text-[18px] font-medium tracking-[-0.01em]"
                  style={{ color: 'var(--gs-fg-0)' }}
                >
                  GitHub sign-in could not finish
                </h1>
                <p
                  className="mt-2 text-[13px] leading-[1.55]"
                  style={{ color: 'var(--gs-fg-2)' }}
                >
                  {errorMessage}
                </p>
              </div>
              <Link href="/login" className="inline-block">
                <Button variant="primary" size="md" glow>
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mt-7 space-y-5">
              <div
                className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-md border"
                style={{
                  background: 'var(--gs-accent-soft)',
                  borderColor:
                    'color-mix(in oklch, var(--gs-accent-primary) 30%, transparent)',
                  color: 'var(--gs-accent-primary)',
                }}
              >
                <Loader2 size={18} className="animate-spin" />
              </div>
              <div>
                <h1
                  className="text-[18px] font-medium tracking-[-0.01em]"
                  style={{ color: 'var(--gs-fg-0)' }}
                >
                  Linking your GitHub account
                </h1>
                <p
                  className="mt-2 text-[12.5px] leading-[1.55]"
                  style={{ color: 'var(--gs-fg-2)' }}
                  aria-live="polite"
                >
                  {STEPS[stepIndex]}…
                </p>
              </div>
              <div className="space-y-2 px-4 text-left">
                <Shimmer height={8} width="80%" />
                <Shimmer height={8} width="65%" />
                <Shimmer height={8} width="72%" />
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
