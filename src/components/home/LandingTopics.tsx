import { Box, Chip, Container, Typography } from '@mui/material';
import { LANDING_TOPICS } from '@/components/home/landing-data';

export function LandingTopics() {
  return (
    <Box sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Explore by topic
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
        {LANDING_TOPICS.map(({ label, topic }) => (
          <Chip
            key={label}
            label={label}
            component="a"
            href={`/bills?topic=${encodeURIComponent(topic)}`}
            clickable
            variant="outlined"
            sx={{ fontWeight: 500, borderRadius: '16px' }}
          />
        ))}
        <Chip
          label="more →"
          component="a"
          href="/bills"
          clickable
          variant="outlined"
          sx={{ fontWeight: 500, borderRadius: '16px' }}
        />
      </Box>
    </Box>
  );
}
