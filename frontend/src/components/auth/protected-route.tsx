'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ProductLogo } from '@/components/branding/product-logo';
import { useAuth } from '@/components/auth/auth-provider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { ensureGuestSession, guestSession, status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated' && !guestSession) {
      void ensureGuestSession();
    }
  }, [ensureGuestSession, guestSession, status]);

  if (status === 'loading' || (status === 'unauthenticated' && !guestSession)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <ProductLogo href="/" size="md" showText={true} className="justify-center" />
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-primary" />
            Preparing GitSense workspace
          </div>
        </div>
      </div>
    );
  }

  return children;
}
