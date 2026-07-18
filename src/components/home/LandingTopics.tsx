import { Box, Chip, Typography } from '@mui/material';
import { LANDING_TOPICS } from '@/components/home/landing-data';
import { kyTopicPath } from '@/lib/ky-topic-pages';

export function LandingTopics() {
  return (
    <Box sx={{ mb: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Typography variant="h5" component="h2" fontWeight={700} gutterBottom>
        Bills by topic
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 560, mx: 'auto' }}
      >
        Bills grouped by subject. Topic tags are automated and can miss or mislabel some bills.
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center',
          mt: 2,
          // WCAG 2.5.5: topic chips here are the primary "Bills by topic"
          // affordance — 44px on touch, default on desktop.
          '& .MuiChip-clickable': {
            height: { xs: 44, sm: 'auto' },
          },
        }}
      >
        {LANDING_TOPICS.map(({ label, topic }) => (
          <Chip
            key={label}
            label={label}
            component="a"
            href={kyTopicPath(topic)}
            clickable
            variant="outlined"
            sx={{ fontWeight: 500, borderRadius: '16px' }}
          />
        ))}
        <Chip
          label="All topics →"
          component="a"
          href="/bills/topics"
          clickable
          variant="outlined"
          sx={{ fontWeight: 500, borderRadius: '16px' }}
        />
        <Chip
          label="Browse bills →"
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
