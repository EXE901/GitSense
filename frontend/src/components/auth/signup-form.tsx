'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { FormInput } from '@/components/auth/form-input';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { PremiumButton } from '@/components/auth/premium-button';
import { useAuth } from '@/components/auth/auth-provider';

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
    <AuthCard title="Create your account" subtitle="Open a GitSense workspace to track repository signals and analytics.">
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

        <label className="flex items-start gap-2.5 text-xs text-muted-foreground/80 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="rounded border border-white/20 mt-0.5 checked:border-primary checked:bg-primary transition-all"
            required
          />
          <span>
            I understand GitSense will create a secure workspace account for repository analytics and insights.
          </span>
        </label>

        <PremiumButton type="submit" variant="primary" className="mt-6" isLoading={isSubmitting}>
          Create account
        </PremiumButton>
      </form>

      <div className="text-center text-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <span className="text-muted-foreground">Already have an account? </span>
        <Link href="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </div>
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
