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
// HB 904 approximates editor-notes-enriched output (migration 038) — notes feed the
// prompt as grounding but carry no distinct UI treatment (removed 2026-07-06 pending SMEs).
// WS3-04: every sample renders with the description basis line. `state` names the
// render state each sample shows. The changed-bill flag is set by hand here; on the
// bill page it comes from billChangedAfterIntroduction(texts, history).
const SAMPLES: {
  billNumber: string;
  title: string;
  summary: string;
  state: string;
  changedAfterIntroduction?: boolean;
}[] = [
  {
    billNumber: 'HB 748',
    title: 'AN ACT relating to agriculture.',
    state: 'Description basis, unchanged bill, no audience clause stored',
    summary:
      'This bill makes a minor change to an existing Kentucky agriculture law by updating the wording to use gender-neutral language. It does not change any policies or requirements in the law itself.',
  },
  {
    billNumber: 'HB 904',
    state: 'Changed-bill caveat (bill changed after introduction), audience clause hidden',
    changedAfterIntroduction: true,
    title: 'AN ACT relating to gaming.',
    summary:
      'This law, called the Wagering Consumer Protection Act, makes major changes to how Kentucky oversees gambling-related activities, raising the participation age for sports wagering and charitable gaming from 18 to 21 and increasing licensing fees. It also requires all electronic pull-tab devices at a licensed charitable gaming site to sit in a single cordoned-off area readily visible to the gaming chairperson, with entrance monitoring and ID checks where under-21s are allowed on the premises.\n\nWho it may affect: people who participate in sports wagering or charitable gaming, veterans service organizations such as VFW, AMVETS, and American Legion posts, fraternal orders and similar private clubs that run charitable gaming, and businesses that distribute or manufacture gaming supplies.',
  },
  {
    billNumber: 'HB 408',
    state: 'Unchanged bill, stored "Who it may affect" clause hidden at render',
    title: 'AN ACT relating to end-of-life options.',
    summary:
      'This bill, known as Rena’s Law, would allow Kentuckians who are terminally ill and meet specific conditions to voluntarily request a prescription medication they could self-administer to end their own life. It sets rules for how such a request must be made and documented, allows patients to change their minds at any time, and makes clear that participating health care providers cannot be penalized for their involvement.\n\nWho it may affect: Kentuckians with a terminal illness, their families and caregivers, and health care providers including doctors and other attending medical professionals.',
  },
  {
    billNumber: 'HB 660',
    state: 'Unchanged bill, stored "Who it may affect" clause hidden at render',
    title: 'AN ACT relating to highway resurfacing.',
    summary:
      'This bill requires the state Department of Highways to give cities at least 60 days advance notice before starting a road resurfacing project within their boundaries. Cities would have the opportunity to submit comments on the project, and the department would be required to respond to that feedback.\n\nWho it may affect: residents of cities across Kentucky, as well as local city governments involved in highway resurfacing decisions.',
  },
];

export default function DevBillSummaryPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        AI summary section preview
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Dev-only. Renders the bill-detail summary card (beta) with real dry-run output, one
        sample per render state: the description basis line, the changed-bill caveat, and a
        stored audience clause hidden at render time.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {SAMPLES.map((s) => (
          <Box key={s.billNumber}>
            <Typography variant="overline" color="text.secondary">
              {s.billNumber}: {s.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              State: {s.state}
            </Typography>
            <MuiCard sx={{ mt: 0.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <MuiCardContent>
                <AiGeneratedBlock
                  basis={{ kind: 'description' }}
                  changedAfterIntroduction={s.changedAfterIntroduction}
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
