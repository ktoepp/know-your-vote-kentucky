import { Box, Container, Skeleton } from '@mui/material';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';

/**
 * Streaming fallback for browse routes (`loading.tsx`). Mirrors the shared
 * browse shell — `Container maxWidth="lg"` + title/toolbar + `CardGrid` — so
 * the swap to real content causes no layout shift.
 */
export function BrowseLoadingSkeleton({ cards = 9 }: { cards?: number }) {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Skeleton variant="text" width={220} sx={{ fontSize: '2.5rem' }} />
      <Skeleton variant="text" width={360} sx={{ maxWidth: '100%', mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <Skeleton variant="rounded" width={140} height={44} />
        <Skeleton variant="rounded" width={140} height={44} />
        <Skeleton variant="rounded" width={140} height={44} sx={{ display: { xs: 'none', sm: 'block' } }} />
      </Box>
      <CardGrid>
        {Array.from({ length: cards }, (_, i) => (
          <CardGridItem key={i}>
            <Skeleton variant="rounded" height={190} sx={{ borderRadius: 3 }} />
          </CardGridItem>
        ))}
      </CardGrid>
    </Container>
  );
}
