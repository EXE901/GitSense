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

export function SignupForm() {
  const router = useRouter();
  const { signup, status } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const username = buildUsername(firstName, lastName, email);

    if (!firstName.trim() || !lastName.trim() || !email.includes('@') || password.length < 8) {
      setErrorMessage('Complete all fields with a valid email and an 8+ character password.');
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage('Please acknowledge the workspace terms to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ email, username, password });
      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Open a GitSense workspace to track repository signals and analytics."
    >
      <RevealGroup stagger={80} y={12} duration={360} className="space-y-5">
        <div>
          <OAuthButtons />
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
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

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="First name"
              placeholder="John"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              required
            />
            <FormInput
              label="Last name"
              placeholder="Doe"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              required
            />
          </div>

          <FormInput
            label="Work email"
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
            autoComplete="new-password"
            required
          />

          <label
            className="flex items-start gap-2.5 text-[12px]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-[3px] h-3.5 w-3.5 rounded border accent-[color:var(--gs-accent-primary)]"
              style={{ borderColor: 'var(--gs-border-default)' }}
              required
            />
            <span>
              I understand GitSense will create a secure workspace account for repository
              analytics and insights.
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            size="md"
            glow
            loading={isSubmitting}
            className="w-full"
          >
            Create account
          </Button>
        </form>

        <div
          className="text-center text-[12.5px]"
          style={{ color: 'var(--gs-fg-2)' }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium transition-colors hover:text-[color:var(--gs-fg-0)]"
            style={{ color: 'var(--gs-accent-primary)' }}
          >
            Sign in
          </Link>
        </div>
      </RevealGroup>
    </AuthCard>
  );
}

function buildUsername(firstName: string, lastName: string, email: string): string {
  const fallback = email.split('@')[0] || 'user';
  const base = `${firstName}-${lastName}`.trim() || fallback;
  const username = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return username || 'user';
}
