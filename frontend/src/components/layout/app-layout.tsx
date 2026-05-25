'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Footer } from '@/components/dashboard/footer';
import { AppShell } from '@/components/layout/app-shell';
import { RouteFade } from '@/components/motion';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppShell sidebar={<Sidebar />} topbar={<Header />} footer={<Footer />}>
      <RouteFade>{children}</RouteFade>
    </AppShell>
  );
}
