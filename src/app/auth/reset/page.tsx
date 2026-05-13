'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Link as MuiLink, TextField, Typography } from '@mui/material';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';

async function establishRecoverySession(client: SupabaseClient, cancelledRef: { current: boolean }) {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
  if (hash) {
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      const { error: sessionErr } = await client.auth.setSession({
        access_token,
        refresh_token,
      });
      if (!cancelledRef.current && !sessionErr) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  return Boolean(session);
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const client = supabase;
    const cancelledRef = { current: false };

    void (async () => {
      const hasSession = await establishRecoverySession(client, cancelledRef);
      if (!cancelledRef.current && hasSession) {
        setReady(true);
      }
    })();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!supabase) return;
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/auth/login'), 2000);
  };

  if (!supabase) {
    return (
      <AuthPaperLayout title="Reset password">
        <Alert severity="warning">Authentication service is not configured.</Alert>
      </AuthPaperLayout>
    );
  }

  if (!ready) {
    return (
      <AuthPaperLayout title="Reset password" subtitle="Confirming your reset link…">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      </AuthPaperLayout>
    );
  }

  return (
    <AuthPaperLayout title="Choose a new password" subtitle="Your recovery session is active.">
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="new-password"
          margin="normal"
        />
        <TextField
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          fullWidth
          autoComplete="new-password"
          margin="normal"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {done && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Password updated. Redirecting to log in…
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading || done}>
          {loading ? 'Saving…' : 'Update password'}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
        <MuiLink component={Link} href="/auth/login" underline="hover">
          Back to log in
        </MuiLink>
      </Typography>
    </AuthPaperLayout>
  );
}
