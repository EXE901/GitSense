'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Footer } from '@/components/dashboard/footer';
import { AppShell } from '@/components/layout/app-shell';
import { RouteFade } from '@/components/motion';
import { HelpMenu } from '@/components/tour/help-menu';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <AppShell sidebar={<Sidebar />} topbar={<Header />} footer={<Footer />}>
      <RouteFade>{children}</RouteFade>
      <HelpMenu />
    </AppShell>
  );
}
