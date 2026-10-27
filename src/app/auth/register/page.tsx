'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { authEmailRedirectOrigin } from '@/lib/site-canonical';
import { safeAuthRedirectPath } from '@/lib/auth-redirect';
import { signupUiState, verifyRedirectUrl } from '@/lib/auth/signup-result';
import { syncPostHogUser, trackUserRegistered } from '@/lib/analytics';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; redirectTo: string } | null>(null);
  const sentHeadingRef = useRef<HTMLParagraphElement>(null);
  const safeNext = safeAuthRedirectPath(searchParams.get('next'), '');

  useEffect(() => {
    if (sent) sentHeadingRef.current?.focus();
  }, [sent]);

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
    const emailRedirectTo = verifyRedirectUrl(authEmailRedirectOrigin(), safeNext);
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });
    const state = signupUiState({ session: data.session, error: signErr });
    if (state === 'error') {
      setLoading(false);
      setError(signErr?.message ?? 'Could not create your account. Try again.');
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
    trackUserRegistered({
      needs_verification: !emailVerified,
      email_verified: emailVerified,
    });
    setLoading(false);

    if (state === 'check-email') {
      setSent({ email, redirectTo: emailRedirectTo });
      return;
    }

    router.refresh();
    // Content-surface prompts (e.g. the district map result) pass `next=` so the
    // new member lands back on what they were doing; default stays /bills.
    router.push(safeNext || '/bills');
  };

  if (sent) {
    const loginHref = safeNext ? `/auth/login?next=${encodeURIComponent(safeNext)}` : '/auth/login';
    return (
      <AuthPaperLayout title="Check your inbox">
        <Stack spacing={2}>
          <Typography ref={sentHeadingRef} tabIndex={-1} variant="body1" align="center" sx={{ outline: 'none' }}>
            We sent a link to <strong>{sent.email}</strong>. Select it to finish creating your account.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            If it does not arrive in a few minutes, check your spam folder.
          </Typography>
          <ResendConfirmationButton email={sent.email} emailRedirectTo={sent.redirectTo} startCoolingDown />
        </Stack>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          Confirmed your address?{' '}
          <MuiLink component={Link} href={loginHref} underline="hover">
            Log in
          </MuiLink>
        </Typography>
      </AuthPaperLayout>
    );
  }

  return (
    <AuthPaperLayout
      title="Create account"
      subtitle="Use your email to register. We will email you a link to confirm your address."
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthPaperLayout title="Create account" subtitle="Loading…">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress aria-label="Loading" />
          </Box>
        </AuthPaperLayout>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
