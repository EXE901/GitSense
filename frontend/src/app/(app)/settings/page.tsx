import { SettingsClient } from '@/components/settings/settings-client';

export const metadata = {
  title: 'Settings - GitSense',
  description: 'GitSense workspace settings',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
