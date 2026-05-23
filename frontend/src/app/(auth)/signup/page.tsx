import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/signup-form';

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Create a GitSense account to unlock engineering intelligence for your GitHub workspaces.',
  alternates: { canonical: '/signup' },
  openGraph: {
    title: 'Create your account · GitSense',
    description: 'Create a GitSense account to unlock engineering intelligence for your GitHub workspaces.',
    url: '/signup',
    type: 'website',
  },
};

export default function SignUpPage() {
  return <SignupForm />;
}
