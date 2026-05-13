'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';

async function exchangeSessionTokens(
  client: SupabaseClient,
  access_token: string,
  refresh_token: string,
): Promise<void> {
  const { error: sessionErr } = await client.auth.setSession({
    access_token,
    refresh_token,
  });
  if (sessionErr) {
    throw sessionErr;
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setMessage('Authentication service is not configured.');
      return;
    }

    const client = supabase;
    let cancelled = false;

    void (async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const type = params.get('type');
          if (!access_token || !refresh_token) {
            if (!cancelled) {
              setStatus('error');
              setMessage('This verification link is incomplete or expired.');
            }
            return;
          }
          await exchangeSessionTokens(client, access_token, refresh_token);
          if (!cancelled) {
            const isRecovery = type === 'recovery';
            setStatus('ok');
            setMessage(
              isRecovery
                ? 'Recovery link confirmed. If you meant to reset your password, open the reset page from your email.'
                : 'Your email is verified. You can finish signing in or go to your profile.',
            );
          }
          return;
        }

        const {
          data: { session },
        } = await client.auth.getSession();
        if (!cancelled) {
          if (session?.user?.email_confirmed_at) {
            setStatus('ok');
            setMessage('Your account is verified.');
          } else {
            setStatus('error');
            setMessage(
              'No verification token was found. Open the link from your email, or request a new confirmation from your profile after signing in.',
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Verification failed.';
        if (!cancelled) {
          setStatus('error');
          setMessage(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthPaperLayout title="Email verification">
      {status === 'working' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          <CircularProgress aria-label="Verifying" />
          <Typography variant="body2" color="text.secondary">
            Confirming your email…
          </Typography>
        </Box>
      )}
      {status !== 'working' && message && (
        <Alert severity={status === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}
      {status === 'ok' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" component={Link} href="/profile" fullWidth size="large">
            Go to profile
          </Button>
          <Button variant="outlined" component={Link} href="/bills" fullWidth>
            Browse bills
          </Button>
        </Box>
      )}
      {status === 'error' && (
        <Button variant="outlined" component={Link} href="/auth/login" fullWidth sx={{ mt: 1 }}>
          Back to log in
        </Button>
      )}
    </AuthPaperLayout>
  );
}
