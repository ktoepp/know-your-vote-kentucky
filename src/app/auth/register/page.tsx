'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { authEmailRedirectOrigin } from '@/lib/site-canonical';
import { syncPostHogUser, trackUserRegistered } from '@/lib/analytics';

async function establishSessionAfterSignup(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/auth/establish-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  if (!res.ok || !body.access_token || !body.refresh_token) {
    return { ok: false, error: body.error ?? 'Could not sign you in after signup.' };
  }
  if (!supabase) {
    return { ok: false, error: 'Authentication service is not configured.' };
  }
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (sessionErr) {
    return { ok: false, error: sessionErr.message };
  }
  return { ok: true };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Authentication service is not configured.');
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    const origin = authEmailRedirectOrigin();
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/verify`,
      },
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }
    const identities = data.user?.identities;
    if (identities && identities.length === 0) {
      setLoading(false);
      setError(
        'This email is already registered or could not be confirmed. Try logging in, or use “Forgot password” on the login page.',
      );
      return;
    }

    const emailVerified = Boolean(data.user?.email_confirmed_at);
    syncPostHogUser(data.user);

    let signedIn = Boolean(data.session);
    if (!signedIn) {
      const sessionResult = await establishSessionAfterSignup(email, password);
      if (!sessionResult.ok) {
        setLoading(false);
        setError(sessionResult.error);
        return;
      }
      signedIn = true;
    }

    setLoading(false);
    if (!signedIn) {
      setError('Account created, but we could not start your session. Try logging in.');
      return;
    }

    trackUserRegistered({
      needs_verification: !emailVerified,
      email_verified: emailVerified,
    });
    router.refresh();
    router.push('/bills');
  };

  return (
    <AuthPaperLayout
      title="Create account"
      subtitle="Use your email to register. You can browse right away. We will send a link to verify your address."
    >
      <Box component="form" onSubmit={handleRegister}>
        <Stack spacing={2}>
          <TextField
            label="Display name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            fullWidth
            autoComplete="name"
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
            helperText="At least 8 characters. Use one you do not reuse elsewhere."
          />
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1.5, lineHeight: 1.5 }}>
          By creating an account you agree to our{' '}
          <MuiLink component={Link} href="/terms" underline="hover">terms</MuiLink>
          {' '}and{' '}
          <MuiLink component={Link} href="/privacy" underline="hover">privacy policy</MuiLink>.
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
        Already registered?{' '}
        <MuiLink component={Link} href="/auth/login" underline="hover">
          Log in
        </MuiLink>
      </Typography>
    </AuthPaperLayout>
  );
}
