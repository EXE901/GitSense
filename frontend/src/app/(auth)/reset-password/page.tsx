import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = {
  title: 'Reset Password - GitSense',
  description: 'Create a new GitSense account password',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-card/70" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
