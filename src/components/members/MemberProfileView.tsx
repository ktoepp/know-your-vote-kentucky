'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Container } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { MemberCard } from '@/components/members/MemberCard';
import { ICON_REM } from '@/lib/ui-tokens';

export function MemberProfileView({ leg }: { leg: KYLegislator }) {
  const router = useRouter();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: ICON_REM.nav }} />}
          onClick={() => router.push('/members')}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        >
          All members
        </Button>

        {!leg.active && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            This legislator is not marked active in the current roster. Information may be from a prior term.
          </Alert>
        )}

        <MemberCard leg={leg} featured={false} />
      </Container>
    </Box>
  );
}
