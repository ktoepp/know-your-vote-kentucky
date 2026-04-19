'use client';

import React from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Person, Dashboard as DashboardIcon, Logout } from '@mui/icons-material';
import { useUser } from '../lib/UserContext';

export default function ProfilePage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Sign in
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            View your account details after you sign in.
          </Typography>
          <Button component={Link} href="/auth/login" variant="contained">
            Go to login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Person color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Account
          </Typography>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Signed in as
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, wordBreak: 'break-word' }}>
          {user.email}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Button component={Link} href="/dashboard" variant="outlined" startIcon={<DashboardIcon />}>
            Dashboard
          </Button>
          <Button component={Link} href="/auth/logout" variant="outlined" color="inherit" startIcon={<Logout />}>
            Log out
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
