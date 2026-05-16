'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ProductLogo } from '@/components/branding/product-logo';
import { useAuth } from '@/components/auth/auth-provider';

export function GitHubOAuthCallback() {
  const router = useRouter();
  const { completeOAuthLogin } = useAuth();
  const hasStartedCompletion = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasStartedCompletion.current) {
      return;
    }

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

      queueMicrotask(() => setErrorMessage('GitHub did not return an authentication token.'));
      return;
    }

    window.history.replaceState(null, '', window.location.pathname);

    completeOAuthLogin(accessToken)
      .then(() => router.replace('/dashboard'))
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to complete GitHub sign-in.'
        );
      });
  }, [completeOAuthLogin, router]);

  return (
    <div className="flex min-h-[420px] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl shadow-black/20">
        <ProductLogo href="/" size="md" showText={true} className="justify-center" />

        {errorMessage ? (
          <div className="mt-8 space-y-4">
            <h1 className="text-xl font-semibold text-foreground">GitHub sign-in could not finish</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Loader2 size={22} className="animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Completing GitHub sign-in</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We are securing your GitSense session and redirecting you to the dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
