import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from '@/lib/structured-data';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';
import {
  KY_TOPIC_INTROS,
  KY_TOPIC_TAGGING_DISCLOSURE,
  kyTopicPath,
} from '@/lib/ky-topic-pages';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION = `Kentucky General Assembly bills grouped into 22 subject areas, from education and healthcare to transportation. ${KY_TOPIC_TAGGING_DISCLOSURE}`;

export const metadata: Metadata = buildPageMetadata({
  title: 'Kentucky bills by topic',
  description: DESCRIPTION,
  path: '/bills/topics',
});

export default function TopicsIndexPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildCollectionPageJsonLd({
            name: 'Kentucky bills by topic',
            description: DESCRIPTION,
            path: '/bills/topics',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Bills', path: '/bills' },
            { name: 'Topics', path: '/bills/topics' },
          ]),
        ]}
      />
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Topics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        Kentucky General Assembly bills grouped into 22 subject areas.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        {KY_TOPIC_TAGGING_DISCLOSURE}
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', rowGap: 2 }}>
        {KY_TOPICS.map((tag) => (
          <Box component="li" key={tag}>
            <Typography variant="body1" fontWeight={600}>
              <MuiLink component={NextLink} href={kyTopicPath(tag)} underline="hover">
                {tag}
              </MuiLink>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {KY_TOPIC_INTROS[tag]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
