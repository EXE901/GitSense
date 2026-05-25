import { AuthSplitLayout } from '@/components/layout/auth-split-layout';
import { LenisProvider } from '@/components/motion';

export default function AuthRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LenisProvider>
      <AuthSplitLayout>{children}</AuthSplitLayout>
    </LenisProvider>
  );
}
