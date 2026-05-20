import { Box, Container, Typography } from '@mui/material';
import { getSessionBannerModel } from '@/lib/ky-session-banner';

export function SessionBannerServer() {
  const { sessionName, dateRange, showAfterSessionNote } = getSessionBannerModel();

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: 1,
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="body2" color="text.secondary" fontWeight={500} textAlign="center">
          {sessionName}: {dateRange}
        </Typography>
        {showAfterSessionNote && (
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            Chambers or committees can still post limited activity after the last scheduled day.{' '}
            <Box
              component="a"
              href="https://legislature.ky.gov/Committee/Schedule"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'primary.main', textDecoration: 'underline' }}
            >
              Check the LRC for meetings and published calendars.
            </Box>
          </Typography>
        )}
      </Container>
    </Box>
  );
}
