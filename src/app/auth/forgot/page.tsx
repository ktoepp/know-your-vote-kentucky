'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert, Box, Button, Link as MuiLink, TextField, Typography } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';
import { authEmailRedirectOrigin } from '@/lib/site-canonical';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);
    if (!supabase) {
      setError('Authentication service is not configured.');
      setLoading(false);
      return;
    }
    const origin = authEmailRedirectOrigin();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset`,
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
    } else {
      setSent(true);
    }
  };

  return (
    <AuthPaperLayout
      title="Reset password"
      subtitle="Enter your account email. If it matches an account, we will send a reset link."
    >
      <Box component="form" onSubmit={handleSubmit}>
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
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {sent && (
          <Alert severity="success" sx={{ mt: 2 }}>
            If an account exists for that email, you will receive a reset link shortly.
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
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
