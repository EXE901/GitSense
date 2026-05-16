import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Trends - GitSense',
  description: 'GitHub issue trend analysis',
};

export default function TrendsPage() {
  return <DashboardClient view="analytics" />;
}
