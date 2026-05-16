import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Analytics - GitSense',
  description: 'GitHub issue analytics and trends',
};

export default function AnalyticsPage() {
  return <DashboardClient view="analytics" />;
}
