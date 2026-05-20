'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useUser } from '@/app/lib/UserContext';

/** Redirects signed-in users to `/feed`; otherwise renders children. */
export function HomeAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && user) {
      router.replace('/feed');
    }
  }, [user, userLoading, router]);

  if (userLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
