import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Dashboard - GitSense',
  description: 'GitHub issue analytics and engineering insights',
};

export default function DashboardPage() {
  return <DashboardClient view="dashboard" />;
}
