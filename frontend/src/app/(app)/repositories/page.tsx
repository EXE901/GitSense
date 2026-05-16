import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = {
  title: 'Repositories - GitSense',
  description: 'Repository issue intelligence',
};

export default function RepositoriesPage() {
  return <DashboardClient view="issues" />;
}
