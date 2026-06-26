import { notFound } from 'next/navigation';
import { Box, Card as MuiCard, CardContent as MuiCardContent, Container, Typography } from '@mui/material';
import { AiGeneratedBlock } from '@/components/civic/AiAttribution';

export const dynamic = 'force-dynamic';

/**
 * Dev-only preview of the AI plain-language summary section (beta) as it renders on
 * /bills/[id], using real backfill-dry-run output. Lets us solve the frontend before
 * populating ky_bills.ai_summary. Gated to non-production.
 *   /dev/bill-summary-preview
 */

// Verbatim samples from `npm run backfill:bill-summaries:dry` (2026-06-26).
const SAMPLES: { billNumber: string; title: string; summary: string }[] = [
  {
    billNumber: 'HB 408',
    title: 'AN ACT relating to end-of-life options.',
    summary:
      'This bill, known as Rena’s Law, would allow Kentuckians who are terminally ill and meet specific conditions to voluntarily request a prescription medication they could self-administer to end their own life. It sets rules for how such a request must be made and documented, allows patients to change their minds at any time, and makes clear that participating health care providers cannot be penalized for their involvement.\n\nWho it may affect: Kentuckians with a terminal illness, their families and caregivers, and health care providers including doctors and other attending medical professionals.',
  },
  {
    billNumber: 'HB 660',
    title: 'AN ACT relating to highway resurfacing.',
    summary:
      'This bill requires the state Department of Highways to give cities at least 60 days advance notice before starting a road resurfacing project within their boundaries. Cities would have the opportunity to submit comments on the project, and the department would be required to respond to that feedback.\n\nWho it may affect: residents of cities across Kentucky, as well as local city governments involved in highway resurfacing decisions.',
  },
  {
    billNumber: 'HB 748',
    title: 'AN ACT relating to agriculture.',
    summary:
      'This bill makes a minor change to an existing Kentucky agriculture law by updating the wording to use gender-neutral language. It does not change any policies or requirements in the law itself.',
  },
];

export default function DevBillSummaryPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        AI summary section — preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Dev-only. Renders the bill-detail summary card (beta) with real dry-run output: with an
        audience clause, and a trivial bill where the clause is correctly omitted.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {SAMPLES.map((s) => (
          <Box key={s.billNumber}>
            <Typography variant="overline" color="text.secondary">
              {s.billNumber} — {s.title}
            </Typography>
            <MuiCard sx={{ mt: 0.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <MuiCardContent>
                <AiGeneratedBlock
                  officialHref="https://apps.legislature.ky.gov/"
                  officialLabel="Open official bill text (PDF)"
                  billNumber={s.billNumber}
                  beta
                >
                  {s.summary}
                </AiGeneratedBlock>
              </MuiCardContent>
            </MuiCard>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
