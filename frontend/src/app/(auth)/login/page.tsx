import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your GitSense workspace to view operational analytics, issue trends, and contributor signals.',
  alternates: { canonical: '/login' },
  openGraph: {
    title: 'Sign in · GitSense',
    description: 'Sign in to your GitSense workspace.',
    url: '/login',
    type: 'website',
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
