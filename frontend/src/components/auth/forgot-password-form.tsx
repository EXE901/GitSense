'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { PremiumButton } from '@/components/auth/premium-button';
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
      subtitle="We'll send a reset link to your email address"
    >
      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        {message && (
          <p className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300" role="status">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
            <span>{message}</span>
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <FormInput
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <PremiumButton type="submit" variant="primary" isLoading={isSubmitting}>
          Send reset link
        </PremiumButton>

        <p className="text-xs text-muted-foreground/70 text-center leading-relaxed">
          If this account only uses OAuth, sign in with GitHub or Google instead of resetting a password.
        </p>
      </form>

      <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
