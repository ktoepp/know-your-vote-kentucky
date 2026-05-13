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
import { authEmailRedirectOrigin } from '@/lib/site-canonical';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (!supabase) {
      setError('Authentication service is not configured.');
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
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    // Duplicate or reused email: Supabase may return a user row with no identities (no email sent again).
    const identities = data.user?.identities;
    if (identities && identities.length === 0) {
      setError(
        'This email is already registered or could not be confirmed. Try logging in, or use “Forgot password” on the login page.',
      );
      return;
    }
    // No session until the user confirms — hosted/local with email confirmations on.
    if (data.session) {
      router.refresh();
      router.push('/profile');
      return;
    }
    setSuccess(true);
  };

  return (
    <AuthPaperLayout
      title="Create account"
      subtitle="Use your email to register. We will send a link to verify your address."
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
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
            helperText="Choose a strong password you do not reuse elsewhere."
          />
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
              Check your email for a confirmation link. After verifying, you can sign in.
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              If nothing arrives in a few minutes: check spam, try again, and confirm your Supabase project has
              <strong> Authentication → Providers → Email → Confirm email</strong> enabled, custom{' '}
              <strong>SMTP</strong> saved correctly (if you use it), and{' '}
              <strong>URL Configuration → Redirect URLs</strong> includes this site&apos;s{' '}
              <code style={{ fontSize: '0.85em' }}>/auth/verify</code> URL.
            </Typography>
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading || success}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
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
