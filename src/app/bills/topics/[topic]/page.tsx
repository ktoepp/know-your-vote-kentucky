import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Paper, Typography } from '@mui/material';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildTopicCollectionJsonLd } from '@/lib/structured-data';
import { KY_TOPICS, type KYTopicTag } from '@/lib/ky-topic-classifier';
import {
  KY_TOPIC_INTROS,
  KY_TOPIC_TAGGING_DISCLOSURE,
  kyTopicForSlug,
  kyTopicPath,
  kyTopicPhrase,
  kyTopicSlug,
} from '@/lib/ky-topic-pages';
import { fetchKyBillsBrowsePage } from '@/lib/ky-bills-browse-server';
import { fetchKyActiveLegislatorRosterSlim } from '@/lib/ky-legislator-roster-server';
import { getCivicDataSessionName, KY_BILL_SESSION_OPTIONS } from '@/lib/ky-sessions';
import { kyBillPath } from '@/lib/ky-bill-slug';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 300;

const PAGE_SIZE = 25;

export function generateStaticParams(): { topic: string }[] {
  return KY_TOPICS.map((tag) => ({ topic: kyTopicSlug(tag) }));
}

type PageProps = { params: Promise<{ topic: string }> };

function topicBrowseQuery(tag: KYTopicTag, sessionFilter: string) {
  return {
    chamberMode: 'all' as const,
    chamberFilter: '' as const,
    statusFilter: 'all',
    topicFilter: tag,
    sessionFilter,
    followIds: [],
    sortBy: 'last_action_date' as const,
    sortDir: 'desc' as const,
    page: 1,
    pageSize: PAGE_SIZE,
  };
}

/** Current-session list, falling back to the previous session when the current one has no tagged bills yet. */
async function fetchTopicBills(tag: KYTopicTag) {
  const currentSession = getCivicDataSessionName();
  const current = await fetchKyBillsBrowsePage(topicBrowseQuery(tag, currentSession));
  if (current.bills.length > 0) {
    return { ...current, sessionName: currentSession, isFallbackSession: false };
  }
  const currentIdx = KY_BILL_SESSION_OPTIONS.indexOf(currentSession);
  const previousSession = currentIdx >= 0 ? KY_BILL_SESSION_OPTIONS[currentIdx + 1] : undefined;
  if (!previousSession) {
    return { ...current, sessionName: currentSession, isFallbackSession: false };
  }
  const previous = await fetchKyBillsBrowsePage(topicBrowseQuery(tag, previousSession));
  return { ...previous, sessionName: previousSession, isFallbackSession: true };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params;
  const tag = kyTopicForSlug(topic);
  if (!tag) {
    return { title: 'Topic not found' };
  }
  const session = getCivicDataSessionName();
  return buildPageMetadata({
    title: `Kentucky ${kyTopicPhrase(tag)} bills — ${session}`,
    description: `Kentucky General Assembly bills tagged ${tag} in the ${session} — status, sponsors, and recent activity. ${KY_TOPIC_TAGGING_DISCLOSURE}`,
    path: kyTopicPath(tag),
  });
}

export default async function TopicPage({ params }: PageProps) {
  const { topic } = await params;
  const tag = kyTopicForSlug(topic);
  if (!tag) notFound();

  const [{ bills, total, sessionName, isFallbackSession }, legislatorRoster] = await Promise.all([
    fetchTopicBills(tag),
    fetchKyActiveLegislatorRosterSlim(),
  ]);

  const path = kyTopicPath(tag);
  const intro = KY_TOPIC_INTROS[tag];
  // Two or three neighboring topics (taxonomy order, cyclic) keep every topic
  // page linked to siblings without listing all 22 everywhere.
  const tagIdx = KY_TOPICS.indexOf(tag);
  const siblingTags = [1, 2, 3].map((step) => KY_TOPICS[(tagIdx + step) % KY_TOPICS.length]!);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildTopicCollectionJsonLd({
            name: `Kentucky ${kyTopicPhrase(tag)} bills`,
            description: intro,
            path,
            bills: bills.map((b) => ({
              bill_number: b.bill_number,
              title: b.title,
              path: kyBillPath(b),
            })),
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Bills', path: '/bills' },
            { name: 'Topics', path: '/bills/topics' },
            { name: tag, path },
          ]),
        ]}
      />
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {tag} bills
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {intro}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {KY_TOPIC_TAGGING_DISCLOSURE}{' '}
        <MuiLink
          component={NextLink}
          href={`/bills?topic=${encodeURIComponent(tag)}`}
          underline="hover"
        >
          Browse all bills with this filter →
        </MuiLink>
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 2 }}>
        {isFallbackSession
          ? `No bills are tagged ${tag} in the current session yet. Showing bills from the ${sessionName}.`
          : `${total.toLocaleString()} ${total === 1 ? 'bill' : 'bills'} tagged ${tag} in the ${sessionName}.${
              total > bills.length ? ` Showing the ${bills.length} with the most recent activity.` : ''
            }`}
      </Typography>

      {bills.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            mb: 4,
          }}
        >
          {bills.map((bill) => (
            <KYBillCard key={bill.id} bill={bill} legislators={legislatorRoster} />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          No bills carry this tag in recent sessions.
        </Typography>
      )}

      <Paper
        elevation={0}
        sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      >
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Follow this topic
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Signed-in users can receive email digests when bills tagged {tag} change status.
          Following a specific bill stays the most reliable way to track it.
        </Typography>
        <Typography variant="body2">
          <MuiLink component={NextLink} href="/profile" underline="hover">
            Notification preferences →
          </MuiLink>
          {' · '}
          <MuiLink component={NextLink} href="/auth/register" underline="hover">
            Sign up →
          </MuiLink>
        </Typography>
      </Paper>

      <Box component="nav" aria-label="Related topics">
        <Typography variant="body2" color="text.secondary">
          Related topics:{' '}
          {siblingTags.map((sibling, i) => (
            <Typography key={sibling} variant="body2" component="span">
              {i > 0 && ' · '}
              <MuiLink component={NextLink} href={kyTopicPath(sibling)} underline="hover">
                {sibling}
              </MuiLink>
            </Typography>
          ))}
          {' · '}
          <MuiLink component={NextLink} href="/bills/topics" underline="hover">
            All topics
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}
