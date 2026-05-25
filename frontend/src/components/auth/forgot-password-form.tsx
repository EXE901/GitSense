'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { Button } from '@/components/primitives';
import { RevealGroup } from '@/components/motion';
import { requestPasswordReset } from '@/lib/auth';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      setMessage(await requestPasswordReset(email));
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll send a reset link to your email address."
    >
      <RevealGroup stagger={80} y={12} duration={360} className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {message ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px]"
              style={{
                background:
                  'color-mix(in oklch, var(--gs-state-open) 10%, transparent)',
                borderColor:
                  'color-mix(in oklch, var(--gs-state-open) 30%, transparent)',
                color: 'var(--gs-state-open)',
              }}
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span>{message}</span>
            </p>
          ) : null}

          {error ? (
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
              {error}
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

          <Button
            type="submit"
            variant="primary"
            size="md"
            glow
            loading={isSubmitting}
            className="w-full"
          >
            Send reset link
          </Button>

          <p
            className="text-center text-[11.5px] leading-[1.5]"
            style={{ color: 'var(--gs-fg-2)' }}
          >
            If this account only uses OAuth, sign in with GitHub or Google instead of resetting a password.
          </p>
        </form>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors hover:text-[color:var(--gs-fg-0)]"
            style={{ color: 'var(--gs-accent-primary)' }}
          >
            <ArrowLeft size={13} />
            Back to sign in
          </Link>
        </div>
      </RevealGroup>
    </AuthCard>
  );
}
