import { Box, Container, Typography } from '@mui/material';
import { getSessionBannerModel } from '@/lib/ky-session-banner';

export function SessionBannerServer() {
  const { sessionName, dateRange, contextLine, showLrcLink } = getSessionBannerModel();

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
        {(contextLine || showLrcLink) && (
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            {contextLine}
            {contextLine && showLrcLink ? ' ' : null}
            {showLrcLink && (
              <Box
                component="a"
                href="https://legislature.ky.gov/Committee/Schedule"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'primary.main', textDecoration: 'underline' }}
              >
                Check the Legislative Research Commission (LRC) for posted meetings.
              </Box>
            )}
          </Typography>
        )}
      </Container>
    </Box>
  );
}
