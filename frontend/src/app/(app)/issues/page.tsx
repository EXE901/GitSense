import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Issues - GitSense',
  description: 'Stored GitHub issue feed',
};

export default function IssuesPage() {
  return <DashboardClient view="issues" />;
}
