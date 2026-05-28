'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';
import { safeAuthRedirectPath } from '@/lib/auth-redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError('Authentication service is not configured.');
      setLoading(false);
      return;
    }
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
    } else {
      const next = safeAuthRedirectPath(searchParams.get('next'), '/profile');
      router.push(next);
      router.refresh();
    }
  };

  return (
    <AuthPaperLayout title="Log in" subtitle="Log in to manage your account and preferences.">
      <Box component="form" onSubmit={handleLogin}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          margin="normal"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          margin="normal"
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <MuiLink component={Link} href="/auth/forgot" variant="body2" underline="hover">
            Forgot password?
          </MuiLink>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </Box>
      <Divider sx={{ my: 3 }}>
        <Typography variant="caption" color="text.secondary">
          New here?
        </Typography>
      </Divider>
      <Typography variant="body2" color="text.secondary" align="center">
        Need an account?{' '}
        <MuiLink component={Link} href="/auth/register" underline="hover">
          Create one
        </MuiLink>
      </Typography>
    </AuthPaperLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthPaperLayout title="Log in" subtitle="Loading…">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress aria-label="Loading" />
          </Box>
        </AuthPaperLayout>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
