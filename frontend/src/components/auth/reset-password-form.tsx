'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { PremiumButton } from '@/components/auth/premium-button';
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
  const confirmationError = confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : null;
  const canSubmit = Boolean(token) && !strengthError && !confirmationError && Boolean(confirmPassword);

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
    <AuthCard title="Create a new password" subtitle="Choose a strong password to restore account access">
      {!token && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          This reset link is missing a token. Request a new password reset email.
        </p>
      )}

      {message && (
        <p className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300" role="status">
          <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
          <span>{message}</span>
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
            className="absolute right-10 top-11 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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

        <PremiumButton type="submit" variant="primary" isLoading={isSubmitting} disabled={!canSubmit}>
          Update password
        </PremiumButton>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-primary/80 hover:text-primary font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>
      </div>
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
