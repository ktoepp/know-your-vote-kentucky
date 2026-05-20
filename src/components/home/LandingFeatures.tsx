import { Box, Grid, Typography } from '@mui/material';
import { Notifications, Search } from '@mui/icons-material';
import { LANDING_FEATURE_CARDS } from '@/components/home/landing-data';

const FEATURE_ICONS = [
  <Search key="find" sx={{ fontSize: 28 }} aria-hidden />,
  <Search key="track" sx={{ fontSize: 28 }} aria-hidden />,
  <Notifications key="notify" sx={{ fontSize: 28 }} aria-hidden />,
];

export function LandingFeatures() {
  return (
    <Grid container spacing={3} sx={{ mt: { xs: 4, md: 6 }, mb: { xs: 6, md: 8 } }}>
      {LANDING_FEATURE_CARDS.map(({ title, body }, index) => (
        <Grid item xs={12} sm={4} key={title}>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              textAlign: 'center',
              height: '100%',
            }}
          >
            <Box sx={{ color: 'text.primary', mb: 1.5, display: 'flex', justifyContent: 'center' }}>
              {FEATURE_ICONS[index]}
            </Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {body}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
