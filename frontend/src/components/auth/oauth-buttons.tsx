'use client';

import { useState } from 'react';
import { GitBranch, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';

export function OAuthButtons() {
  const { startProviderLogin } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<'github' | 'google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleProvider(provider: 'github' | 'google') {
    setLoadingProvider(provider);
    setMessage(null);

    try {
      const providerMessage = await startProviderLogin(provider);
      setMessage(providerMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'OAuth sign-in is not available yet.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <button
        type="button"
        onClick={() => handleProvider('github')}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground transition-smooth hover-scale-up disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingProvider === 'github' ? <Loader2 size={18} className="animate-spin" /> : <GitBranch size={18} />}
        <span className="font-medium">Continue with GitHub</span>
      </button>
      <button
        type="button"
        onClick={() => handleProvider('google')}
        disabled={loadingProvider !== null}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground transition-smooth hover-scale-up disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingProvider === 'google' ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
        <span className="font-medium">Continue with Google</span>
      </button>
      {message && (
        <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
