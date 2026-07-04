import { Box, CircularProgress } from '@mui/material';

/**
 * Neutral detail-page fallback. Without this, navigation to the detail route
 * would inherit the parent segment's browse-grid skeleton (wrong shape).
 */
export default function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}
