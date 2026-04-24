'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Box, Breadcrumbs, Button, Container, Link as MuiLink, Typography } from '@mui/material';
import { ArrowBack, ContentCopy, Groups, Map as MapIcon } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { memberProfilePath } from '@/lib/ky-member-utils';
import { MemberName } from '@/components/civic/MemberName';
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

        <Breadcrumbs sx={{ mb: 1.5, '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}>
          <MuiLink component={Link} href="/" color="inherit" underline="hover" variant="body2" fontWeight={500}>
            Home
          </MuiLink>
          <MuiLink component={Link} href="/members" color="inherit" underline="hover" variant="body2" fontWeight={500}>
            Members
          </MuiLink>
          <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ maxWidth: 360 }} noWrap>
            <MemberName member={leg} variant="primary" />
          </Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
          <Button
            component={Link}
            href="/members"
            size="small"
            variant="outlined"
            startIcon={<Groups sx={{ fontSize: ICON_REM.nav }} />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Member list
          </Button>
          <Button
            component={Link}
            href="/members/map"
            size="small"
            variant="outlined"
            startIcon={<MapIcon sx={{ fontSize: ICON_REM.nav }} />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            District map
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<ContentCopy sx={{ fontSize: '0.95rem', opacity: 0.75 }} aria-hidden />}
            onClick={() => {
              if (typeof window !== 'undefined') {
                const url = `${window.location.origin}${memberProfilePath(leg)}`;
                void navigator.clipboard.writeText(url);
              }
            }}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
          >
            Copy page link
          </Button>
        </Box>

        {!leg.active && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            This legislator is not marked active in the current roster. Information may be from a prior term.
          </Alert>
        )}

        <MemberCard leg={leg} featured={false} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 640 }}>
          Profile information is sourced from public data (Open States and official Kentucky sources) and may lag updates.
        </Typography>
      </Container>
    </Box>
  );
}
