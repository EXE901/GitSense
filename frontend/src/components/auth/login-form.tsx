'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/primitives';
import { RevealGroup } from '@/components/motion';
import { confirmEmailVerification } from '@/lib/auth';

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verificationToken = new URLSearchParams(window.location.search).get('verify_token');
    if (verificationToken) {
      confirmEmailVerification(verificationToken)
        .then(() =>
          setStatusMessage('Email verified. Sign in to continue with unlimited repository sync.')
        )
        .catch((error) =>
          setErrorMessage(error instanceof Error ? error.message : 'Unable to verify email.')
        );
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!email.includes('@') || password.length < 8) {
      setErrorMessage('Enter a valid email and a password with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      const searchParams = new URLSearchParams(window.location.search);
      router.push(searchParams.get('next') || '/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your GitSense workspace">
      <RevealGroup stagger={80} y={12} duration={360} className="space-y-5">
        <div>
          <OAuthButtons />
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div
              className="w-full border-t"
              style={{ borderColor: 'var(--gs-border-subtle)' }}
            />
          </div>
          <div className="relative flex justify-center">
            <span
              className="px-3 text-[11px] uppercase tracking-[0.14em]"
              style={{
                background:
                  'color-mix(in oklch, var(--gs-bg-1) 95%, transparent)',
                color: 'var(--gs-fg-2)',
              }}
            >
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-md border px-3 py-2 text-[12.5px]"
              style={{
                background:
                  'color-mix(in oklch, var(--gs-state-danger) 10%, transparent)',
                borderColor:
                  'color-mix(in oklch, var(--gs-state-danger) 30%, transparent)',
                color: 'var(--gs-state-danger)',
              }}
            >
              {errorMessage}
            </p>
          ) : null}
          {statusMessage ? (
            <p
              role="status"
              className="rounded-md border px-3 py-2 text-[12.5px]"
              style={{
                background:
                  'color-mix(in oklch, var(--gs-state-open) 10%, transparent)',
                borderColor:
                  'color-mix(in oklch, var(--gs-state-open) 30%, transparent)',
                color: 'var(--gs-state-open)',
              }}
            >
              {statusMessage}
            </p>
          ) : null}

          <FormInput
            label="Email address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <FormInput
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium transition-colors hover:text-[color:var(--gs-fg-0)]"
              style={{ color: 'var(--gs-accent-primary)' }}
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            glow
            loading={isSubmitting}
            className="w-full"
          >
            Sign in to GitSense
          </Button>
        </form>

        <div
          className="text-center text-[12.5px]"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium transition-colors hover:text-[color:var(--gs-fg-0)]"
            style={{ color: 'var(--gs-accent-primary)' }}
          >
            Create one
          </Link>
        </div>
      </RevealGroup>
    </AuthCard>
  );
}
