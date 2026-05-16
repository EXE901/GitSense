import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Activity - GitSense',
  description: 'Operational GitHub issue activity',
};

export default function ActivityPage() {
  return <DashboardClient view="activity" />;
}
