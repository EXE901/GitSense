import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Login - GitSense',
  description: 'Sign in to your GitSense account',
};

export default function LoginPage() {
  return <LoginForm />;
}
