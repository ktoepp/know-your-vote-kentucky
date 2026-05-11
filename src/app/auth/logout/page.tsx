'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { supabase } from '../../lib/supabaseClient';
import { AuthPaperLayout } from '@/components/auth/AuthPaperLayout';

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    if (supabase) {
      void supabase.auth.signOut().then(() => {
        router.refresh();
        router.push('/auth/login');
      });
    } else {
      router.push('/auth/login');
    }
  }, [router]);
  return (
    <AuthPaperLayout title="Signing out">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
        <CircularProgress aria-label="Signing out" />
        <Typography variant="body2" color="text.secondary">
          Closing your session…
        </Typography>
      </Box>
    </AuthPaperLayout>
  );
}
