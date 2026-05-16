import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata = {
  title: 'Forgot Password - GitSense',
  description: 'Reset your GitSense account password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
