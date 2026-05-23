import type { Metadata } from 'next';
import { GitHubOAuthCallback } from '@/components/auth/github-oauth-callback';

export const metadata: Metadata = {
  title: 'GitHub OAuth',
  description: 'Complete GitHub sign-in for GitSense.',
  robots: { index: false, follow: false },
};

export default function GitHubOAuthCallbackPage() {
  return <GitHubOAuthCallback />;
}
