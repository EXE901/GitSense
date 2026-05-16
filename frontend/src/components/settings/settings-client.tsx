'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bell,
  Check,
  Gauge,
  GitBranch,
  Globe2,
  KeyRound,
  Laptop,
  LinkIcon,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Palette,
  Pencil,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  checkUsernameAvailability,
  deleteAccount,
  fetchAuthSessions,
  logoutAllOtherSessions,
  resendVerification,
  revokeAuthSession,
  startProviderLink,
  unlinkProvider,
  updateAccountProfile,
  type AuthSession,
} from '@/lib/auth';
import {
  fetchUserSettings,
  updateUserSettings,
  type UserSettings,
  type UserSettingsUpdate,
} from '@/lib/settings';
import { pushLocalNotification } from '@/lib/notifications-bus';
import { useAuth } from '@/components/auth/auth-provider';

type ToastState = {
  tone: 'success' | 'error' | 'info';
  text: string;
};

type IdentityField = 'username' | 'display_name' | 'email';

export function SettingsClient() {
  const searchParams = useSearchParams();
  const { logout, refreshUser, token, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();

    Promise.all([
      fetchUserSettings(token, controller.signal),
      fetchAuthSessions(token),
    ])
      .then(([settingsData, sessionsData]) => {
        setSettings(settingsData);
        setSessions(sessionsData);
        setToast(null);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          return;
        }

        setToast({
          tone: 'error',
          text: loadError instanceof Error ? loadError.message : 'Unable to load settings.',
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const oauthMessage = searchParams.get('message');

    if (oauthMessage) {
      queueMicrotask(() => setToast({ tone: 'success', text: oauthMessage }));
    }
  }, [searchParams]);

  const providerLabels = useMemo(
    () => getProviderLabels(settings?.security.connected_providers ?? []),
    [settings?.security.connected_providers]
  );

  async function reloadSettings() {
    if (!token) {
      return;
    }

    const [nextSettings, nextSessions] = await Promise.all([
      fetchUserSettings(token),
      fetchAuthSessions(token),
    ]);
    setSettings(nextSettings);
    setSessions(nextSessions);
  }

  async function saveSettings(payload: UserSettingsUpdate, key: string, successMessage = 'Settings saved.') {
    if (!token) {
      return;
    }

    setSavingKey(key);
    setToast(null);

    try {
      const nextSettings = await updateUserSettings(token, payload);
      setSettings(nextSettings);
      setToast({ tone: 'success', text: successMessage });
    } catch (saveError) {
      setToast({
        tone: 'error',
        text: saveError instanceof Error ? saveError.message : 'Unable to save settings.',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleResendVerification() {
    if (!token) {
      return;
    }

    setSavingKey('verification');
    setToast(null);

    try {
      const message = await resendVerification(token);
      setToast({ tone: 'success', text: message });
      pushLocalNotification({
        kind: 'verification_email_sent',
        title: 'Verification email sent',
        description: 'Check your inbox to confirm and unlock unlimited repository syncs.',
        href: '/settings',
        severity: 'info',
      });
    } catch (verificationError) {
      setToast({
        tone: 'error',
        text: verificationError instanceof Error ? verificationError.message : 'Unable to send verification email.',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleIdentitySave(field: IdentityField, value: string) {
    if (!token) {
      return;
    }

    const payload =
      field === 'display_name'
        ? { display_name: value }
        : field === 'username'
          ? { username: value }
          : { email: value };

    setSavingKey(field);
    setToast(null);

    try {
      await updateAccountProfile(token, payload);
      await refreshUser();
      await reloadSettings();
      setToast({
        tone: 'success',
        text:
          field === 'email'
            ? 'Verification email sent. Your current email remains active until the new address is verified.'
            : 'Identity updated.',
      });

      if (field === 'email') {
        pushLocalNotification({
          kind: 'verification_email_sent',
          title: 'Email change requires verification',
          description: 'Your new address is pending. Current email stays active until verification completes.',
          href: '/settings',
          severity: 'warning',
        });
      }
    } catch (accountError) {
      setToast({
        tone: 'error',
        text: accountError instanceof Error ? accountError.message : 'Unable to update account.',
      });
      throw accountError;
    } finally {
      setSavingKey(null);
    }
  }

  async function handleProviderLink(provider: 'github' | 'google') {
    if (!token) {
      return;
    }

    setSavingKey(`provider-${provider}`);
    setToast(null);

    try {
      const response = await startProviderLink(token, provider);

      if (response.configured && response.authorization_url) {
        window.location.assign(response.authorization_url);
        return;
      }

      throw new Error(response.message);
    } catch (providerError) {
      setToast({
        tone: 'error',
        text: providerError instanceof Error ? providerError.message : `Unable to link ${provider}.`,
      });
      setSavingKey(null);
    }
  }

  async function handleProviderUnlink(provider: 'github' | 'google') {
    if (!token) {
      return;
    }

    setSavingKey(`provider-${provider}`);
    setToast(null);

    try {
      await unlinkProvider(token, provider);
      await refreshUser();
      await reloadSettings();
      setToast({ tone: 'success', text: `${capitalize(provider)} disconnected.` });
      pushLocalNotification({
        kind: 'oauth_link_updated',
        title: `${capitalize(provider)} disconnected`,
        description: `${capitalize(provider)} OAuth has been unlinked from this GitSense account.`,
        href: '/settings',
        severity: 'info',
      });
    } catch (providerError) {
      setToast({
        tone: 'error',
        text: providerError instanceof Error ? providerError.message : `Unable to unlink ${provider}.`,
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSessionRevoke(session: AuthSession) {
    if (!token || session.is_current) {
      return;
    }

    setSavingKey(`session-${session.id}`);
    setToast(null);

    try {
      await revokeAuthSession(token, session.id);
      await reloadSettings();
      setToast({ tone: 'success', text: 'Session revoked.' });
      pushLocalNotification({
        kind: 'session_revoked',
        title: 'Session revoked',
        description: `${session.device_label || 'A device session'} was signed out of GitSense.`,
        href: '/settings',
        severity: 'warning',
      });
    } catch (sessionError) {
      setToast({
        tone: 'error',
        text: sessionError instanceof Error ? sessionError.message : 'Unable to revoke session.',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleLogoutOthers() {
    if (!token) {
      return;
    }

    setSavingKey('logout-all');
    setToast(null);

    try {
      setToast({ tone: 'success', text: await logoutAllOtherSessions(token) });
      await reloadSettings();
    } catch (sessionError) {
      setToast({
        tone: 'error',
        text: sessionError instanceof Error ? sessionError.message : 'Unable to sign out other sessions.',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleAccountDeletion() {
    if (!token) {
      return;
    }

    setSavingKey('delete-account');
    setToast(null);

    try {
      await deleteAccount(token, deleteConfirmation, deletePassword);
      await logout();
    } catch (deleteError) {
      setToast({
        tone: 'error',
        text: deleteError instanceof Error ? deleteError.message : 'Unable to delete account.',
      });
      setSavingKey(null);
    }
  }

  if (!token || !user) {
    return (
      <SettingsShell
        title="Settings require sign in"
        description="Sign in to manage account trust, workspace preferences, and security controls."
      >
        <Link
          href="/login"
          className="inline-flex w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-smooth hover:opacity-90"
        >
          Sign in
        </Link>
      </SettingsShell>
    );
  }

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (!settings) {
    return (
      <SettingsShell title="Settings unavailable" description={toast?.text ?? 'Unable to load settings right now.'}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex w-fit rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-semibold text-foreground transition-smooth hover:bg-secondary"
        >
          Retry
        </button>
      </SettingsShell>
    );
  }

  return (
    <div className="space-y-5">
      {toast && <ToastBanner toast={toast} onDismiss={() => setToast(null)} />}

      {(settings.account.pending_email || (!settings.account.is_email_verified && settings.usage.trust_tier === 'email_unverified')) && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100 shadow-[0_0_40px_rgba(245,158,11,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert size={18} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {settings.account.pending_email
                    ? 'Verify your new email to finalize the change.'
                    : 'Verify your email to unlock unlimited repository synchronization.'}
                </p>
                <p className="mt-1 text-xs text-amber-100/75">
                  {settings.account.pending_email
                    ? `${settings.account.pending_email} is pending. Your current email remains active until verification succeeds.`
                    : 'Unverified email accounts can sync 3 repositories per hour.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={savingKey === 'verification'}
              onClick={handleResendVerification}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-semibold transition-smooth hover:bg-amber-300/10 disabled:opacity-50"
            >
              {savingKey === 'verification' && <Loader2 size={14} className="animate-spin" />}
              Resend verification
            </button>
          </div>
        </section>
      )}

      <SettingsCard
        icon={<UserRound size={18} />}
        title="Identity"
        description="Profile details use explicit edit sessions so nothing sensitive saves while you type."
      >
        <div className="grid gap-3 xl:grid-cols-3">
          <EditableField
            label="Username"
            value={settings.account.username}
            description="Your GitSense workspace handle."
            icon={<UserRound size={16} />}
            saving={savingKey === 'username'}
            validator={(value) => validateUsername(value)}
            availability={{
              token,
              currentValue: settings.account.username,
              check: checkUsernameAvailability,
            }}
            onSave={(value) => handleIdentitySave('username', value)}
          />
          <EditableField
            label="Display name"
            value={settings.account.name}
            description={providerLabels.length ? `Profile can be synced from ${providerLabels.join(' and ')}.` : 'Shown in GitSense navigation and workspace context.'}
            icon={<Sparkles size={16} />}
            providerNote={providerLabels.length ? `Synced source: ${providerLabels.join(', ')}` : undefined}
            saving={savingKey === 'display_name'}
            validator={(value) => (value.length > 120 ? 'Display name must be 120 characters or less.' : null)}
            onSave={(value) => handleIdentitySave('display_name', value)}
          />
          <EditableField
            label="Email"
            value={settings.account.email}
            description="A changed email is held as pending until verification is complete."
            icon={<Mail size={16} />}
            pendingValue={settings.account.pending_email}
            providerNote={settings.account.connected_providers.length ? 'OAuth-linked account. Email changes still require verification.' : undefined}
            saving={savingKey === 'email'}
            validator={validateEmail}
            onSave={(value) => handleIdentitySave('email', value)}
          />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<ShieldCheck size={18} />}
        title="Account Status"
        description="Read-only account health, trust, provider, and verification metadata."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatusTile label="Auth provider" value={settings.account.auth_provider} accent="blue" />
          <StatusTile
            label="Verification"
            value={settings.account.is_email_verified ? 'Verified' : 'Unverified'}
            accent={settings.account.is_email_verified ? 'green' : 'amber'}
          />
          <StatusTile label="Trust tier" value={formatTier(settings.account.trust_tier)} accent={settings.account.trust_tier.includes('verified') ? 'green' : 'amber'} />
          <StatusTile label="Account type" value={settings.account.account_type} accent="muted" />
          <StatusTile label="Linked providers" value={providerLabels.length ? providerLabels.join(', ') : 'None'} accent="muted" />
          <StatusTile label="Created" value={formatDate(settings.account.created_at)} accent="muted" />
          <StatusTile label="Last login" value={settings.account.last_login_at ? formatDate(settings.account.last_login_at) : 'This session'} accent="muted" />
          <StatusTile label="GitHub handle" value={settings.account.github_handle ? `@${settings.account.github_handle}` : 'Not connected'} accent="muted" />
        </div>
      </SettingsCard>

      <SettingsCard icon={<Gauge size={18} />} title="Usage & Limits" description={settings.usage.message}>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricPill label="Tier" value={formatTier(settings.usage.trust_tier)} />
          <MetricPill label="Usage" value={settings.usage.unlimited ? 'Unlimited' : `${settings.usage.syncs_used}/${settings.usage.sync_limit}`} />
          <MetricPill label="Remaining" value={settings.usage.unlimited ? 'Unlimited' : String(settings.usage.remaining_syncs)} />
        </div>
      </SettingsCard>

      <SettingsCard
        icon={<Lock size={18} />}
        title="Security"
        description="Connected identities, password recovery, and active device sessions."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <ProviderRow
            provider="github"
            connected={settings.security.connected_providers.includes('github')}
            disabled={savingKey === 'provider-github'}
            onLink={() => handleProviderLink('github')}
            onUnlink={() => handleProviderUnlink('github')}
          />
          <ProviderRow
            provider="google"
            connected={settings.security.connected_providers.includes('google')}
            disabled={savingKey === 'provider-google'}
            onLink={() => handleProviderLink('google')}
            onUnlink={() => handleProviderUnlink('google')}
          />
        </div>

        <ActionPanel
          icon={<KeyRound size={16} />}
          title="Password recovery"
          description={
            settings.security.password_reset_available
              ? `Last password change: ${settings.security.last_password_change ? formatDate(settings.security.last_password_change) : 'Not recorded yet'}.`
              : 'This account currently signs in through OAuth providers, so password reset is not available.'
          }
          action={
            <Link
              href="/forgot-password"
              aria-disabled={!settings.security.password_reset_available}
              className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-smooth ${
                settings.security.password_reset_available
                  ? 'border-border bg-secondary/40 text-foreground hover:bg-secondary'
                  : 'pointer-events-none border-border/50 bg-secondary/20 text-muted-foreground/60'
              }`}
            >
              <RotateCw size={14} />
              Reset password
            </Link>
          }
        />

        <div className="rounded-xl border border-border bg-background/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Active sessions</p>
              <p className="mt-1 text-xs text-muted-foreground">Review devices signed into your GitSense workspace.</p>
            </div>
            <button
              type="button"
              disabled={savingKey === 'logout-all'}
              onClick={handleLogoutOthers}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs font-semibold text-foreground transition-smooth hover:bg-secondary disabled:opacity-50"
            >
              {savingKey === 'logout-all' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Log out other devices
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                busy={savingKey === `session-${session.id}`}
                onRevoke={() => handleSessionRevoke(session)}
              />
            ))}
          </div>
        </div>

        <ActionPanel
          icon={<LogOut size={16} />}
          title="Current session"
          description="Sign out of this browser session and return to the login screen."
          action={
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex w-fit rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 transition-smooth hover:bg-red-500/15 dark:text-red-300"
            >
              Log out
            </button>
          }
        />
      </SettingsCard>

      <SettingsCard
        icon={<SlidersHorizontal size={18} />}
        title="Workspace Preferences"
        description="Personalize how GitSense restores, scopes, and syncs your repository workspace."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <PreferenceInput
            label="Default repository scope"
            value={settings.workspace.default_repository_scope ?? ''}
            placeholder="owner/repo or blank for Workspace"
            disabled={savingKey === 'workspace-scope'}
            onSave={(value) => saveSettings({ workspace: { default_repository_scope: value } }, 'workspace-scope')}
          />
          <PreferenceInput
            label="Pinned repositories"
            value={settings.workspace.pinned_repositories ?? ''}
            placeholder="owner/repo, owner/repo"
            disabled={savingKey === 'workspace-pins'}
            onSave={(value) => saveSettings({ workspace: { pinned_repositories: value } }, 'workspace-pins')}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ToggleRow
            label="Remember last workspace"
            description="Restore your most recent workspace view when returning."
            checked={settings.workspace.remember_last_workspace}
            disabled={savingKey === 'workspace-remember'}
            onChange={(checked) => saveSettings({ workspace: { remember_last_workspace: checked } }, 'workspace-remember')}
          />
          <ToggleRow
            label="Auto-sync watched repos"
            description="Prepare GitSense to sync watched repositories automatically."
            checked={settings.workspace.auto_sync_watched_repos}
            disabled={savingKey === 'workspace-autosync'}
            onChange={(checked) => saveSettings({ workspace: { auto_sync_watched_repos: checked } }, 'workspace-autosync')}
          />
        </div>
      </SettingsCard>

      <SettingsCard icon={<Bell size={18} />} title="Notifications" description="Operational alerts for repository synchronization and issue activity.">
        <div className="grid gap-3 lg:grid-cols-2">
          <ToggleRow label="Sync completion notifications" description="Notify when repository synchronization completes." checked={settings.notifications.sync_notifications} disabled={savingKey === 'notify-sync'} onChange={(checked) => saveSettings({ notifications: { sync_notifications: checked } }, 'notify-sync')} />
          <ToggleRow label="Stale issue alerts" description="Prepare alerts for long-running open issues." checked={settings.notifications.stale_issue_alerts} disabled={savingKey === 'notify-stale'} onChange={(checked) => saveSettings({ notifications: { stale_issue_alerts: checked } }, 'notify-stale')} />
          <ToggleRow label="Spike detection alerts" description="Foundation for future sudden issue-volume alerts." checked={settings.notifications.spike_detection_alerts} disabled={savingKey === 'notify-spike'} onChange={(checked) => saveSettings({ notifications: { spike_detection_alerts: checked } }, 'notify-spike')} />
          <ToggleRow label="Email notifications" description="Send operational notifications to your verified email." checked={settings.notifications.email_notifications} disabled={savingKey === 'notify-email'} onChange={(checked) => saveSettings({ notifications: { email_notifications: checked } }, 'notify-email')} />
        </div>
      </SettingsCard>

      <SettingsCard icon={<Palette size={18} />} title="Appearance" description="Tune workspace density, motion, and chart behavior. Color theme is controlled from the topbar toggle.">
        <div className="grid gap-3 lg:grid-cols-2">
          <ToggleRow label="Reduced motion" description="Minimize non-essential transitions and decorative animation." checked={settings.appearance.reduced_motion} disabled={savingKey === 'appearance-motion'} onChange={(checked) => saveSettings({ appearance: { reduced_motion: checked } }, 'appearance-motion')} />
          <ToggleRow label="Compact dashboard mode" description="Use denser spacing for power workflows." checked={settings.appearance.compact_dashboard_mode} disabled={savingKey === 'appearance-compact'} onChange={(checked) => saveSettings({ appearance: { compact_dashboard_mode: checked } }, 'appearance-compact')} />
          <ToggleRow label="Chart animations" description="Allow subtle chart transitions on data refresh." checked={settings.appearance.chart_animations} disabled={savingKey === 'appearance-charts'} onChange={(checked) => saveSettings({ appearance: { chart_animations: checked } }, 'appearance-charts')} />
          <ToggleRow label="Remember sidebar collapse" description="Persist sidebar collapse state across sessions." checked={settings.appearance.sidebar_collapse_memory} disabled={savingKey === 'appearance-sidebar'} onChange={(checked) => saveSettings({ appearance: { sidebar_collapse_memory: checked } }, 'appearance-sidebar')} />
        </div>
      </SettingsCard>

      <section className="overflow-hidden rounded-xl border border-red-500/30 bg-red-500/[0.05]">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 dark:text-red-300">
              <Trash2 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-red-500 dark:text-red-100">Danger Zone</p>
              <p className="mt-1 text-xs leading-relaxed text-red-500/70 dark:text-red-100/65">
                Permanent account deletion. Requires explicit confirmation in a dialog.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteConfirmation('');
              setDeletePassword('');
            }}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500 transition-smooth hover:bg-red-500/15 dark:text-red-200"
          >
            <Trash2 size={14} />
            Delete account
          </button>
        </div>
      </section>

      {deleteOpen && (
        <DeleteAccountDialog
          passwordRequired={settings.security.password_reset_available}
          confirmation={deleteConfirmation}
          password={deletePassword}
          saving={savingKey === 'delete-account'}
          onConfirmationChange={setDeleteConfirmation}
          onPasswordChange={setDeletePassword}
          onClose={() => {
            if (savingKey === 'delete-account') {
              return;
            }
            setDeleteOpen(false);
          }}
          onConfirm={handleAccountDeletion}
        />
      )}
    </div>
  );
}

function DeleteAccountDialog({
  passwordRequired,
  confirmation,
  password,
  saving,
  onConfirmationChange,
  onPasswordChange,
  onClose,
  onConfirm,
}: {
  passwordRequired: boolean;
  confirmation: string;
  password: string;
  saving: boolean;
  onConfirmationChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const confirmDisabled =
    saving
    || confirmation !== 'DELETE MY ACCOUNT'
    || (passwordRequired && password.length === 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <button
        type="button"
        aria-label="Close delete account dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/30 bg-card shadow-2xl shadow-red-500/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3 border-b border-red-500/20 bg-red-500/5 p-5">
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-500 dark:text-red-300">
            <ShieldAlert size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="delete-account-title" className="text-base font-semibold text-foreground">
              Delete GitSense account
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              This action is permanent and cannot be undone. Please review what will be removed before confirming.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500/70" />
              Workspace ownership, tracked repositories, and synced issues will be deleted.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500/70" />
              OAuth links (GitHub, Google) will be revoked and active sessions terminated.
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500/70" />
              Exports, share links, and notification history tied to this account become inaccessible.
            </li>
          </ul>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              Type <span className="font-mono text-red-500 dark:text-red-300">DELETE MY ACCOUNT</span> to confirm
            </label>
            <input
              value={confirmation}
              onChange={(event) => onConfirmationChange(event.target.value)}
              placeholder="DELETE MY ACCOUNT"
              autoFocus
              className="w-full rounded-lg border border-red-500/30 bg-background px-3 py-2 text-sm text-foreground outline-none transition-smooth placeholder:text-muted-foreground/50 focus:border-red-400/70 focus:ring-2 focus:ring-red-500/30"
            />
          </div>

          {passwordRequired && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">Confirm with password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-red-500/30 bg-background px-3 py-2 text-sm text-foreground outline-none transition-smooth placeholder:text-muted-foreground/50 focus:border-red-400/70 focus:ring-2 focus:ring-red-500/30"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-red-500/20 bg-background/40 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-smooth hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-500 transition-smooth hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-200"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Permanently delete account
          </button>
        </div>
      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  description,
  icon,
  pendingValue,
  providerNote,
  saving,
  validator,
  availability,
  onSave,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  pendingValue?: string | null;
  providerNote?: string;
  saving: boolean;
  validator: (value: string) => string | null;
  availability?: {
    token: string;
    currentValue: string;
    check: (token: string, username: string) => Promise<boolean>;
  };
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [localError, setLocalError] = useState<string | null>(null);
  const [availabilityState, setAvailabilityState] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const dirty = draft.trim() !== value.trim();
  const validationError = validator(draft.trim());
  const saveDisabled = saving || !dirty || Boolean(validationError) || availabilityState === 'checking' || availabilityState === 'taken';

  useEffect(() => {
    if (!editing) {
      queueMicrotask(() => {
        setDraft(value);
        setLocalError(null);
        setAvailabilityState('idle');
      });
    }
  }, [editing, value]);

  useEffect(() => {
    if (!editing || !availability || !dirty || validationError) {
      queueMicrotask(() => setAvailabilityState('idle'));
      return;
    }

    const username = draft.trim();

    if (username === availability.currentValue) {
      queueMicrotask(() => setAvailabilityState('idle'));
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setAvailabilityState('checking'));
    const timeoutId = window.setTimeout(() => {
      availability
        .check(availability.token, username)
        .then((available) => {
          if (!cancelled) {
            setAvailabilityState(available ? 'available' : 'taken');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setAvailabilityState('idle');
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [availability, dirty, draft, editing, validationError]);

  async function submit() {
    const nextValue = draft.trim();
    const error = validator(nextValue);

    if (error) {
      setLocalError(error);
      return;
    }

    if (saveDisabled) {
      return;
    }

    await onSave(nextValue);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setLocalError(null);
    setEditing(false);
  }

  return (
    <div className={`group rounded-xl border bg-background/30 p-3 transition-smooth ${editing ? 'border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.12)]' : 'border-border hover:border-primary/30 hover:bg-background/45'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {!editing && <p className="mt-1 truncate text-sm text-foreground/90">{value || 'Not set'}</p>}
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/80 px-2 py-1 text-xs font-semibold text-muted-foreground opacity-100 transition-smooth hover:border-primary/40 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>

      {providerNote && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-medium text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-200">
          <LinkIcon size={12} />
          {providerNote}
        </div>
      )}

      {pendingValue && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
          Pending verification: <span className="font-semibold">{pendingValue}</span>
        </div>
      )}

      {editing && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <input
            value={draft}
            autoFocus
            onChange={(event) => {
              setDraft(event.target.value);
              setLocalError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }

              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
            className="w-full rounded-lg border border-primary/40 bg-card px-3 py-2 text-sm text-foreground outline-none transition-smooth placeholder:text-muted-foreground/50 focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <FieldHint
              dirty={dirty}
              error={localError ?? validationError}
              availabilityState={availabilityState}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveDisabled}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-smooth hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldHint({
  dirty,
  error,
  availabilityState,
}: {
  dirty: boolean;
  error: string | null;
  availabilityState: 'idle' | 'checking' | 'available' | 'taken';
}) {
  if (error) {
    return <p className="text-xs text-red-700 dark:text-red-300">{error}</p>;
  }

  if (availabilityState === 'checking') {
    return <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Checking availability</p>;
  }

  if (availabilityState === 'available') {
    return <p className="text-xs text-green-700 dark:text-green-300">Username available</p>;
  }

  if (availabilityState === 'taken') {
    return <p className="text-xs text-red-700 dark:text-red-300">Username is already taken</p>;
  }

  return <p className={`text-xs ${dirty ? 'text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}>{dirty ? 'Unsaved changes' : 'Press Enter to save or Esc to cancel'}</p>;
}

function ProviderRow({
  provider,
  connected,
  disabled,
  onLink,
  onUnlink,
}: {
  provider: 'github' | 'google';
  connected: boolean;
  disabled: boolean;
  onLink: () => void;
  onUnlink: () => void;
}) {
  const label = capitalize(provider);
  const Icon = provider === 'github' ? GitBranch : Globe2;

  return (
    <div className="rounded-xl border border-border bg-background/30 p-3 transition-smooth hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border bg-card p-2 text-foreground">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {connected
                ? `Managed by ${label}. This provider can be used for trusted sign-in.`
                : `Connect ${label} for OAuth sign-in and provider-verified trust.`}
            </p>
          </div>
        </div>
        <StatusBadge tone={connected ? 'green' : 'muted'}>{connected ? 'Connected' : 'Not linked'}</StatusBadge>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={connected ? onUnlink : onLink}
        className={`mt-3 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-smooth disabled:cursor-not-allowed disabled:opacity-50 ${
          connected
            ? 'border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-300'
            : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
        }`}
      >
        {disabled && <Loader2 size={14} className="animate-spin" />}
        {connected ? 'Disconnect provider' : `Connect ${label}`}
      </button>
    </div>
  );
}

function SessionRow({
  session,
  busy,
  onRevoke,
}: {
  session: AuthSession;
  busy: boolean;
  onRevoke: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-lg border border-border bg-background/60 p-2 text-muted-foreground">
          <Laptop size={15} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{session.device_label}</p>
            {session.is_current && <StatusBadge tone="blue">Current device</StatusBadge>}
            {session.revoked_at && <StatusBadge tone="red">Revoked</StatusBadge>}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Last active {formatDate(session.last_seen_at)} · {session.ip_address ?? 'Unknown IP'}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={session.is_current || busy || Boolean(session.revoked_at)}
        onClick={onRevoke}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-smooth hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Revoke
      </button>
    </div>
  );
}

function PreferenceInput({
  label,
  value,
  placeholder,
  disabled,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft !== value;

  useEffect(() => {
    queueMicrotask(() => setDraft(value));
  }, [value]);

  return (
    <label className="block rounded-xl border border-border bg-background/30 p-3">
      <span className="block text-sm font-semibold text-foreground">{label}</span>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-smooth placeholder:text-muted-foreground/50 focus:border-primary/50"
        />
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() => onSave(draft)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-smooth hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {disabled ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save
        </button>
      </div>
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-background/30 p-3 transition-smooth hover:border-primary/25 ${
        disabled ? 'pointer-events-none opacity-70' : ''
      } ${checked ? 'border-primary/35 bg-primary/[0.04]' : 'border-border'}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-label={label}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none block h-6 w-11 rounded-full border transition-smooth ${
            checked ? 'border-primary/60 bg-primary/80' : 'border-border bg-secondary/70'
          }`}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm ring-1 ring-border transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
        {disabled && (
          <Loader2 size={12} aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1.5 animate-spin text-primary-foreground/80" />
        )}
      </span>
    </label>
  );
}

function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.12)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StatusTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'green' | 'amber' | 'red' | 'blue' | 'muted';
}) {
  const accentClass = {
    green: 'border-green-500/25 text-green-700 dark:text-green-300',
    amber: 'border-amber-500/25 text-amber-700 dark:text-amber-300',
    red: 'border-red-500/25 text-red-700 dark:text-red-300',
    blue: 'border-blue-500/30 text-blue-700 dark:border-blue-400/25 dark:text-blue-300',
    muted: 'border-border text-foreground',
  }[accent];

  return (
    <div className={`rounded-xl border bg-background/35 p-3 ${accentClass}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock size={12} />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border bg-card p-2 text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'muted'; children: React.ReactNode }) {
  const toneClass = {
    green: 'border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300',
    amber: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    red: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300',
    muted: 'border-border bg-secondary/30 text-muted-foreground',
  }[tone];

  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}

function ToastBanner({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const toneClass =
    toast.tone === 'error'
      ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
      : toast.tone === 'success'
        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
        : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300';

  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${toneClass}`}>
      <p>{toast.text}</p>
      <button type="button" onClick={onDismiss} className="text-current opacity-70 transition-smooth hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

function validateUsername(value: string) {
  if (value.length < 2) {
    return 'Username must be at least 2 characters.';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return 'Use letters, numbers, dashes, or underscores only.';
  }

  return null;
}

function validateEmail(value: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Enter a valid email address.';
  }

  return null;
}

function getProviderLabels(providers: string[]) {
  return providers.map((provider) => capitalize(provider));
}

function formatTier(tier: string) {
  return tier.replace(/_/g, ' ');
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}
