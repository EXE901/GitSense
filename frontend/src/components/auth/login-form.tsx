'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { PremiumButton } from '@/components/auth/premium-button';
import { useAuth } from '@/components/auth/auth-provider';
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
        .then(() => setStatusMessage('Email verified. Sign in to continue with unlimited repository sync.'))
        .catch((error) => setErrorMessage(error instanceof Error ? error.message : 'Unable to verify email.'));
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
    <AuthCard title="Welcome back" subtitle="Sign in to your GitSense account">
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <OAuthButtons />
      </div>

      <div className="relative animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50 dark:border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground/70">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {errorMessage && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive/90" role="alert">
            {errorMessage}
          </p>
        )}
        {statusMessage && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300" role="status">
            {statusMessage}
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
            className="text-sm text-primary/80 hover:text-primary transition-colors font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <PremiumButton type="submit" variant="primary" className="mt-6" isLoading={isSubmitting}>
          Sign in to GitSense
        </PremiumButton>
      </form>

      <div className="text-center text-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <span className="text-muted-foreground">Don&apos;t have an account? </span>
        <Link href="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">
          Create one
        </Link>
      </div>
    </AuthCard>
  );
}
