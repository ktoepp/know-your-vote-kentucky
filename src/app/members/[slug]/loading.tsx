import { Box, Container, Skeleton } from '@mui/material';

/**
 * `/members/[slug]` renders dynamically (session switcher reads searchParams), so without
 * this the browser sits on the previous page until the full data waterfall resolves —
 * the single biggest source of perceived lag on profile navigations.
 */
export default function Loading() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={220} height={28} sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.5fr) minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
              <Skeleton variant="circular" width={72} height={72} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="55%" height={36} />
                <Skeleton variant="text" width="35%" />
                <Skeleton variant="text" width="45%" />
              </Box>
            </Box>
            <Skeleton variant="rounded" height={120} sx={{ mb: 3 }} />
            <Skeleton variant="text" width={180} height={30} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={96} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={96} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={96} />
          </Box>
          <Box>
            <Skeleton variant="rounded" height={200} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" height={160} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
