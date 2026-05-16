import { PremiumAuthLayout } from '@/components/layout/premium-auth-layout';

export default function AuthRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PremiumAuthLayout>{children}</PremiumAuthLayout>;
}
