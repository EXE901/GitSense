import { GitHubOAuthCallback } from '@/components/auth/github-oauth-callback';

export const metadata = {
  title: 'GitHub OAuth - GitSense',
  description: 'Complete GitHub sign-in for GitSense',
};

export default function GitHubOAuthCallbackPage() {
  return <GitHubOAuthCallback />;
}
