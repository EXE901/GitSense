'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { Button } from '@/components/primitives';
import { RevealGroup } from '@/components/motion';
import { resetPassword } from '@/lib/auth';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strengthError = useMemo(() => validatePassword(password), [password]);
  const confirmationError =
    confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : null;
  const canSubmit =
    Boolean(token) && !strengthError && !confirmationError && Boolean(confirmPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError(strengthError ?? confirmationError ?? 'Reset link is missing or expired.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      setMessage(await resetPassword(token, password));
      setPassword('');
      setConfirmPassword('');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create a new password"
      subtitle="Choose a strong password to restore account access."
    >
      <RevealGroup stagger={80} y={12} duration={360} className="space-y-5">
        {!token ? (
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
            This reset link is missing a token. Request a new password reset email.
          </p>
        ) : null}

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
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <FormInput
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 12 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={password ? strengthError ?? undefined : undefined}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-[34px] transition-colors hover:text-[color:var(--gs-fg-0)]"
              style={{ color: 'var(--gs-fg-2)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <FormInput
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={confirmationError ?? undefined}
            autoComplete="new-password"
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            glow
            loading={isSubmitting}
            disabled={!canSubmit}
            className="w-full"
          >
            Update password
          </Button>
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

function validatePassword(value: string) {
  if (value.length < 12) {
    return 'Password must be at least 12 characters.';
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Include uppercase, lowercase, and a number.';
  }
  return null;
}
