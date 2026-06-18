'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  PersonOutline,
  ShieldOutlined,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useUser } from '../lib/UserContext';
import { supabase } from '../lib/supabaseClient';
import type { KyUserProfileRow } from '@/types/user-profile';
import { KY_USER_PROFILE_SELECT } from '@/lib/ky-user-profile-select';
import { ProfileNotificationsSection } from '@/components/profile/ProfileNotificationsSection';
import { ProfileFollowedBillsSection } from '@/components/profile/ProfileFollowedBillsSection';
import { ProfileFollowedCommitteesSection } from '@/components/profile/ProfileFollowedCommitteesSection';
import { ProfileActivitySection } from '@/components/profile/ProfileActivitySection';
import { ProfileDigestHistorySection } from '@/components/profile/ProfileDigestHistorySection';
import { ProfileSavedSearchesSection } from '@/components/profile/ProfileSavedSearchesSection';
import { authEmailRedirectOrigin } from '@/lib/site-canonical';
import { trackAccountDeleted } from '@/lib/analytics';

const PROFILE_SECTION_SCROLL_MARGIN = { scrollMarginTop: { xs: '7.5rem', sm: '8rem' } };

function SectionCard({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      id={id}
      component="section"
      elevation={1}
      sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
          {icon}
        </Box>
        <Typography variant="h6" component="h2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      {children}
    </Paper>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, session, loading: authLoading } = useUser();
  const [profile, setProfile] = useState<KyUserProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);

  const emailVerified = Boolean(profile?.email_verified_at);

  const loadProfile = useCallback(async () => {
    if (!supabase || !user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await supabase
      .from('ky_user_profiles')
      .select(KY_USER_PROFILE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle();
    setProfileLoading(false);
    if (error) {
      setProfileError(error.message);
      setProfile(null);
      return;
    }
    setProfile(data as KyUserProfileRow | null);
    if (data?.display_name) {
      setDisplayName(data.display_name);
    } else if (user.user_metadata?.full_name) {
      setDisplayName(String(user.user_metadata.full_name));
    } else {
      setDisplayName('');
    }
  }, [user?.id, user?.user_metadata?.full_name]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (authLoading || (Boolean(user) && profileLoading) || !user) return;
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [authLoading, profileLoading, user]);

  const accessToken = session?.access_token;

  const handleSaveDisplayName = async () => {
    if (!supabase || !user?.id) return;
    setSavingName(true);
    setNameSaved(false);
    const trimmed = displayName.trim();
    const { error } = await supabase
      .from('ky_user_profiles')
      .update({ display_name: trimmed || null })
      .eq('user_id', user.id);
    setSavingName(false);
    if (error) {
      setProfileError(error.message);
      return;
    }
    setNameSaved(true);
    void loadProfile();
    setTimeout(() => setNameSaved(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ tone: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ tone: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (!supabase) return;
    setPasswordBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (error) {
      setPasswordMsg({ tone: 'error', text: error.message });
      return;
    }
    setPasswordMsg({ tone: 'success', text: 'Password updated.' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || next === user?.email?.toLowerCase()) {
      setEmailMsg({ tone: 'error', text: 'Enter a new email address.' });
      return;
    }
    if (!supabase) return;
    const origin = authEmailRedirectOrigin();
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: next },
      { emailRedirectTo: `${origin}/auth/verify` },
    );
    setEmailBusy(false);
    if (error) {
      setEmailMsg({ tone: 'error', text: error.message });
      return;
    }
    setEmailMsg({
      tone: 'success',
      text: 'Check your new inbox for a confirmation link. You may need to sign in again afterward.',
    });
    setNewEmail('');
  };

  const handleResendVerification = async () => {
    if (!supabase || !user?.email) return;
    setResendBusy(true);
    setResendMsg(null);
    const origin = authEmailRedirectOrigin();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${origin}/auth/verify` },
    });
    setResendBusy(false);
    if (error) {
      setResendMsg(error.message);
      return;
    }
    setResendMsg('Verification email sent.');
  };

  const handleDeleteAccount = async () => {
    if (!accessToken) return;
    if (deleteConfirm.trim().toLowerCase() !== user?.email?.trim().toLowerCase()) {
      setDeleteError('Email does not match.');
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/me/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(typeof body.error === 'string' ? body.error : 'Could not delete account.');
        setDeleteBusy(false);
        return;
      }
      trackAccountDeleted();
      await supabase?.auth.signOut();
      router.push('/');
    } catch {
      setDeleteError('Could not delete account.');
    }
    setDeleteBusy(false);
  };

  const layoutLoading = authLoading || (Boolean(user) && profileLoading);

  const accountEmail = useMemo(() => user?.email ?? profile?.email ?? '', [user?.email, profile?.email]);

  if (layoutLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress aria-label="Loading profile" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Log in
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Log in to manage your account and security settings.
          </Typography>
          <Button
            component={Link}
            href={`/auth/login?next=${encodeURIComponent('/profile')}`}
            variant="contained"
          >
            Go to log in
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Manage your account, email digest preferences, followed bills, and sign-in security.
      </Typography>

      <Box
        component="nav"
        aria-label="Profile sections"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 3,
          position: 'sticky',
          top: { xs: 56, sm: 64 },
          zIndex: 10,
          py: 1,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {[
          { href: '#account', label: 'Account' },
          { href: '#notifications', label: 'Notifications' },
          { href: '#followed-bills', label: 'Followed bills' },
          { href: '#followed-committees', label: 'Followed committees' },
          { href: '#saved-searches', label: 'Saved searches' },
          { href: '#activity', label: 'Activity' },
          { href: '#digest-history', label: 'Digest history' },
          { href: '#security', label: 'Security' },
        ].map((item) => (
          <Chip
            key={item.href}
            component="a"
            href={item.href}
            label={item.label}
            size="small"
            clickable
            variant="outlined"
          />
        ))}
      </Box>

      {!emailVerified && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" disabled={resendBusy} onClick={() => void handleResendVerification()}>
              {resendBusy ? 'Sending…' : 'Resend email'}
            </Button>
          }
        >
          Your email is not verified yet. Email digests and other notifications stay off until you confirm your address.
          {resendMsg && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {resendMsg}
            </Typography>
          )}
        </Alert>
      )}

      <SectionCard id="account" icon={<PersonOutline sx={{ fontSize: 28 }} />} title="Account">
        {profileError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not load extended profile ({profileError}). If this persists after refresh, ensure migration{' '}
            <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
              016_ky_user_profiles
            </Typography>{' '}
            is applied.
          </Alert>
        )}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Email
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
            {accountEmail}
          </Typography>
          <Chip
            size="small"
            label={emailVerified ? 'Verified' : 'Unverified'}
            color={emailVerified ? 'success' : 'warning'}
            variant={emailVerified ? 'filled' : 'outlined'}
          />
        </Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Display name
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Shown where we personalize copy for you (email templates and future profile surfaces).
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { sm: 'flex-start' } }}>
          <TextField
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            fullWidth
            size="small"
            inputProps={{ maxLength: 120 }}
          />
          <Button variant="contained" disabled={savingName} onClick={() => void handleSaveDisplayName()}>
            {savingName ? 'Saving…' : 'Save'}
          </Button>
        </Box>
        {nameSaved && (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
            Saved.
          </Typography>
        )}
      </SectionCard>

      <Paper component="section" id="notifications" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileNotificationsSection />
      </Paper>

      <Paper component="section" id="followed-bills" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileFollowedBillsSection />
      </Paper>

      <Paper component="section" id="followed-committees" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileFollowedCommitteesSection />
      </Paper>

      <Paper component="section" id="saved-searches" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileSavedSearchesSection />
      </Paper>

      <Paper component="section" id="activity" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileActivitySection />
      </Paper>

      <Paper component="section" id="digest-history" elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2, mb: 3, ...PROFILE_SECTION_SCROLL_MARGIN }}>
        <ProfileDigestHistorySection />
      </Paper>

      <SectionCard id="security" icon={<ShieldOutlined sx={{ fontSize: 28 }} />} title="Security">
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Your data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Download a JSON copy of your profile, follows, notification preferences, and recent digest log.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          disabled={exportBusy || !session?.access_token}
          sx={{ mb: 1 }}
          onClick={async () => {
            if (!session?.access_token) return;
            setExportBusy(true);
            setExportMsg(null);
            try {
              const res = await fetch('/api/me/export', {
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              if (!res.ok) throw new Error('Export failed');
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'kyvky-export.json';
              a.click();
              URL.revokeObjectURL(url);
              setExportMsg('Download started.');
            } catch {
              setExportMsg('Could not export data. Try again later.');
            } finally {
              setExportBusy(false);
            }
          }}
        >
          {exportBusy ? 'Preparing…' : 'Download my data'}
        </Button>
        {exportMsg && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            {exportMsg}
          </Typography>
        )}

        {emailVerified && (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
              Welcome email
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Resend the one-time setup email if you lost the original.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={welcomeBusy}
              onClick={async () => {
                if (!session?.access_token) return;
                setWelcomeBusy(true);
                setWelcomeMsg(null);
                try {
                  const res = await fetch('/api/me/welcome-email?force=1', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  const body = (await res.json().catch(() => ({}))) as { sent?: boolean; error?: string };
                  if (!res.ok) throw new Error(body.error || 'Send failed');
                  setWelcomeMsg(body.sent ? 'Welcome email sent.' : 'Could not send — check Resend configuration.');
                } catch (e) {
                  setWelcomeMsg(e instanceof Error ? e.message : 'Send failed');
                } finally {
                  setWelcomeBusy(false);
                }
              }}
            >
              {welcomeBusy ? 'Sending…' : 'Send welcome email again'}
            </Button>
            {welcomeMsg && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 2 }}>
                {welcomeMsg}
              </Typography>
            )}
          </>
        )}

        <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
          Change password
        </Typography>
        <Box component="form" onSubmit={handleChangePassword} sx={{ maxWidth: 440 }}>
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            autoComplete="new-password"
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            autoComplete="new-password"
          />
          {passwordMsg && (
            <Alert severity={passwordMsg.tone} sx={{ mt: 1 }}>
              {passwordMsg.text}
            </Alert>
          )}
          <Button type="submit" variant="outlined" sx={{ mt: 2 }} disabled={passwordBusy}>
            {passwordBusy ? 'Updating…' : 'Update password'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Change email
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          We send a confirmation link to the new address. Your sign-in email updates after you confirm.
        </Typography>
        <Box component="form" onSubmit={handleChangeEmail} sx={{ maxWidth: 440 }}>
          <TextField
            label="New email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            autoComplete="email"
          />
          {emailMsg && (
            <Alert severity={emailMsg.tone} sx={{ mt: 1 }}>
              {emailMsg.text}
            </Alert>
          )}
          <Button type="submit" variant="outlined" sx={{ mt: 2 }} disabled={emailBusy}>
            {emailBusy ? 'Sending…' : 'Request email change'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
          Delete account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Permanently deletes your account and associated preferences. This cannot be undone.
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setDeleteOpen(true)}>
          Delete account…
        </Button>
      </SectionCard>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button component={Link} href="/auth/logout" variant="outlined" color="inherit" startIcon={<LogoutIcon />}>
          Log out
        </Button>
      </Box>

      <Dialog open={deleteOpen} onClose={() => !deleteBusy && setDeleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Delete account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Type your email <strong>{user.email}</strong> to confirm.
          </Typography>
          <TextField
            label="Email"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            fullWidth
            autoComplete="off"
          />
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button color="error" variant="contained" disabled={deleteBusy} onClick={() => void handleDeleteAccount()}>
            {deleteBusy ? 'Deleting…' : 'Delete forever'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
