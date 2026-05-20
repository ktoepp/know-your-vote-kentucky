'use client';

import React from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Gavel, ArrowForward } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { civicPaletteTokens } from '@/lib/theme';
import { SectionHeader } from '@/components/civic/SectionHeader';
import { EmptyState } from '@/components/civic/EmptyState';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { SponsorAvatarChip } from '@/components/civic/SponsorAvatarChip';
import { AiSummaryTooltip, AiSummaryInline } from '@/components/civic/AiAttribution';
import {
  MetaChip,
  SeverityChip,
  ChamberChip,
  BillNumberChip,
} from '@/components/ui/Chip';
import { BillNumber } from '@/components/bills/BillNumber';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { CivicCard } from '@/components/ui/CivicCard';
import StatsGrid from '@/components/bills/StatsGrid';
import type { KYBill } from '@/types/kentucky';
import {
  CheckCircle,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', overflow: 'hidden' }}>
      <Box
        sx={{
          height: 44,
          borderRadius: 1,
          bgcolor: value,
          border: '1px solid',
          borderColor: 'divider',
          mb: 1,
        }}
      />
      <Typography variant="caption" display="block" fontWeight={600} noWrap title={label}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>
        {value}
      </Typography>
    </Paper>
  );
}

const DEMO_BILL: KYBill = {
  id: '00000000-0000-0000-0000-000000000099',
  legiscan_id: 999001,
  openstates_id: null,
  bill_number: 'HB 199',
  title: 'An Act relating to civic design systems and demonstrating the standard bill card layout across multiple lines.',
  description: null,
  ai_summary: null,
  session: '2026 Regular Session',
  chamber: 'house',
  status: 'In Committee',
  introduced_date: null,
  last_action_date: new Date().toISOString().slice(0, 10),
  last_action: 'referred to Committee on Appropriations and Revenue (H)',
  bill_text_url: null,
  topics: ['Education', 'Budget'],
  sponsors: {
    sponsors: [
      { name: 'Alex Example', party: 'Democrat', sponsor_type_id: 1 },
      { name: 'Jordan Sample', party: 'Republican', sponsor_type_id: 1 },
    ],
  } as KYBill['sponsors'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  source: 'legiscan',
};

const TYPO_VARIANTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'caption', 'overline'] as const;

export default function DesignSystemPage() {
  const theme = useTheme();
  const neutralEntries = Object.entries(civicPaletteTokens.neutral).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  return (
    <Box sx={{ bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={5}>
          <Box>
            <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
              Design system
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
              Source tokens and MUI theme live in{' '}
              <Typography component="span" variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                src/lib/theme.ts
              </Typography>
              . The app wraps pages with{' '}
              <Typography component="span" variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                ClientThemeProvider
              </Typography>{' '}
              (light theme). Reusable civic building blocks live under{' '}
              <Typography component="span" variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                src/components/civic
              </Typography>{' '}
              and bill UI under{' '}
              <Typography component="span" variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                src/components/bills
              </Typography>
              .
            </Typography>
          </Box>

          <Divider />

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Civic palette tokens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Exported as <Typography component="span" sx={{ fontFamily: 'monospace' }}>civicPaletteTokens</Typography> — used as the light theme
              palette roots (dark theme adjusts several values inline).
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Primary, secondary, semantic
            </Typography>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {(
                [
                  ['primary.main', civicPaletteTokens.primary.main],
                  ['primary.light', civicPaletteTokens.primary.light],
                  ['primary.dark', civicPaletteTokens.primary.dark],
                  ['secondary.main', civicPaletteTokens.secondary.main],
                  ['success.main', civicPaletteTokens.success.main],
                  ['warning.main', civicPaletteTokens.warning.main],
                  ['error.main', civicPaletteTokens.error.main],
                  /* info token removed — primary carries informational colour */
                ] as const
              ).map(([label, value]) => (
                <Grid item xs={6} sm={4} md={3} key={label}>
                  <Swatch label={label} value={value} />
                </Grid>
              ))}
            </Grid>
            <Typography variant="subtitle2" gutterBottom>
              Neutral scale
            </Typography>
            <Grid container spacing={1.5}>
              {neutralEntries.map(([step, hex]) => (
                <Grid item xs={4} sm={3} md={2} key={step}>
                  <Swatch label={`neutral.${step}`} value={hex} />
                </Grid>
              ))}
            </Grid>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Resolved theme (light)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Access at runtime with <Typography component="span" sx={{ fontFamily: 'monospace' }}>useTheme()</Typography>.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Token</TableCell>
                    <TableCell>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace' }}>palette.mode</TableCell>
                    <TableCell>{theme.palette.mode}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace' }}>shape.borderRadius</TableCell>
                    <TableCell>{theme.shape.borderRadius}px (buttons / inputs); cards override to 12px in theme</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace' }}>palette.background.default</TableCell>
                    <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 20, height: 20, borderRadius: 0.5, bgcolor: 'background.default', border: 1, borderColor: 'divider' }} />
                      {theme.palette.background.default}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace' }}>palette.divider</TableCell>
                    <TableCell>{theme.palette.divider}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Helpers: <Typography component="span" sx={{ fontFamily: 'monospace' }}>getThemeColor</Typography>,{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>getEventTypeColor</Typography>,{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>getPriorityColor</Typography> in{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>theme.ts</Typography>.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Typography scale
            </Typography>
            <Stack spacing={2}>
              {TYPO_VARIANTS.map((variant) => (
                <Box key={variant}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {variant}
                  </Typography>
                  <Typography variant={variant}>
                    {variant.startsWith('h') ? 'Know Your Vote Kentucky' : 'The quick brown fox watches the General Assembly.'}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Bill number utilities (MUI <Typography component="span" sx={{ fontFamily: 'monospace' }}>Typography</Typography> class names)
            </Typography>
            <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
              <BillNumber billNumber="HB 1" size="detail" />
              <BillNumber billNumber="SB 12" size="card" />
              <BillNumber billNumber="HCR 3" size="compact" />
              <BillNumber billNumber="HR 55" size="inline" />
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Legislator avatar with party badge
            </Typography>
            <Stack direction="row" gap={2} alignItems="center">
              <LegislatorAvatar
                party="Democratic"
                initials="LW"
                sx={{ width: 40, height: 40 }}
                alt="Lisa Willner portrait"
              />
              <LegislatorAvatar
                party="Republican"
                initials="JC"
                sx={{ width: 48, height: 48, fontSize: '1rem' }}
                alt="Josh Calloway portrait"
              />
            </Stack>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              MUI primitives (theme overrides)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Buttons use sentence case (<Typography component="span" sx={{ fontFamily: 'monospace' }}>textTransform: none</Typography>), 8px radius,
              40px min height. Cards and Paper default to 12px radius and a light border.
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Button variant="contained" color="primary" endIcon={<ArrowForward />}>
                Primary
              </Button>
              <Button variant="contained" color="secondary">Secondary</Button>
              <Button variant="outlined" color="primary">Outlined</Button>
              <Button variant="text">Text</Button>
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip label="Default" size="small" variant="outlined" />
              <Chip label="Primary" size="small" color="primary" variant="outlined" />
              <Chip label="Success" size="small" color="success" variant="outlined" />
              <Chip label="Warning" size="small" color="warning" variant="outlined" />
            </Stack>
            <TextField size="small" label="Search" placeholder="Keywords…" sx={{ minWidth: 280, mb: 2 }} />
            <Stack gap={1} sx={{ maxWidth: 560 }}>
              <Alert severity="info">Informational alert</Alert>
              <Alert severity="success">Success alert</Alert>
              <Alert severity="warning">Warning alert</Alert>
            </Stack>
            <Typography sx={{ mt: 2 }}>
              Inline link: <Link href="/">Home</Link>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Pattern: marketing hero
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gradient band used on the home page hero (primary main → primary light).
            </Typography>
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                background:
                  theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.default} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                color: theme.palette.primary.contrastText,
                py: 3,
                px: 3,
              }}
            >
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Sample hero title
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                Supporting line with muted contrast text.
              </Typography>
              <Button component={Link} href="/bills" variant="contained" color="secondary" size="small" endIcon={<ArrowForward />}>
                Browse bills
              </Button>
            </Box>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Sections and layout components
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <SectionHeader
                title="Example section"
                icon={<Gavel />}
                href="/bills"
                caption="Optional caption aligned under the title row."
              />
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <EmptyState message="No items match your filters." />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Data freshness
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>DataFreshnessNote</Typography> reads{' '}
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>ky_sources</Typography> when Supabase is configured.
                      </Typography>
                      <DataFreshnessNote variant="page" placement="footer" />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
            <Typography variant="subtitle2" gutterBottom>
              Stats grid
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>StatsGrid</Typography> — dashboard-style metric cards.
            </Typography>
            <StatsGrid
              columns={3}
              stats={[
                { id: 'a', title: 'Tracked bills', value: 128, icon: <Gavel />, color: 'primary', description: 'Kentucky GA' },
                { id: 'b', title: 'This week', value: 12, change: 4, icon: <TrendingUp />, color: 'success' },
                { id: 'c', title: 'Upcoming', value: 3, icon: <Schedule />, color: 'info' },
              ]}
            />
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Civic chips and AI attribution
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <SponsorAvatarChip name="Pat Example" party="Democrat" />
              <SponsorAvatarChip name="Chris Sample" party="Republican" />
            </Stack>
            <Paper variant="outlined" sx={{ p: 2, maxWidth: 480 }}>
              <AiSummaryTooltip>
                Short AI-generated summary text used inside tooltips and detail panels.
              </AiSummaryTooltip>
              <AiSummaryInline>
                Two-line clamped inline summary for dense list surfaces.
              </AiSummaryInline>
            </Paper>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Canonical chip primitives
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Shared <Typography component="span" sx={{ fontFamily: 'monospace' }}>Chip</Typography> components from{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>components/ui/Chip.tsx</Typography>. All four
              accept <Typography component="span" sx={{ fontFamily: 'monospace' }}>{'{ label, icon?, tone?, size? }'}</Typography> and
              pass remaining props through to MUI Chip.
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              MetaChip
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
              <MetaChip label="Education" />
              <MetaChip label="Budget" tone="primary" />
              <MetaChip label="With icon" icon={<Gavel />} />
              <MetaChip label="Compact" size="small" />
              <MetaChip label="Filled" variant="filled" tone="primary" />
            </Stack>
            <Typography variant="subtitle2" gutterBottom>
              SeverityChip
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
              <SeverityChip label="Info" severity="info" />
              <SeverityChip label="Success" severity="success" icon={<CheckCircle />} />
              <SeverityChip label="Warning" severity="warning" />
              <SeverityChip label="Error" severity="error" />
              <SeverityChip label="Compact" severity="success" size="small" />
            </Stack>
            <Typography variant="subtitle2" gutterBottom>
              ChamberChip
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
              <ChamberChip chamber="house" />
              <ChamberChip chamber="senate" />
              <ChamberChip chamber="house" variant="outlined" />
              <ChamberChip chamber="senate" size="small" />
            </Stack>
            <Typography variant="subtitle2" gutterBottom>
              BillNumberChip
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }} alignItems="center">
              <BillNumberChip billNumber="HB 1" />
              <BillNumberChip billNumber="SB 12" tone="primary" />
              <BillNumberChip billNumber="HCR 3" size="small" />
              <BillNumberChip billNumber="HB 199" variant="filled" tone="primary" />
            </Stack>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              CivicCard shell
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>CivicCard</Typography> — shared border, radius,
              elevation, padding, and hover/focus treatment for bill, member, ordinance, and meeting cards.
              Slots (<Typography component="span" sx={{ fontFamily: 'monospace' }}>header</Typography>,{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>body</Typography>,{' '}
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>footer</Typography>) are passed as named props.
              Tokens live in <Typography component="span" sx={{ fontFamily: 'monospace' }}>ui-tokens.ts#CARD</Typography>.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <CivicCard
                  variant="bill"
                  href="/design-system"
                  ariaLabel="CivicCard demo — bill variant"
                  header={
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      <ChamberChip chamber="house" />
                      <MetaChip label="In committee" />
                    </Stack>
                  }
                  body={
                    <>
                      <Typography variant="h6" component="p" fontWeight={700} gutterBottom>
                        HB 199
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Interactive variant — full-card link with focus-visible ring (tab to see).
                      </Typography>
                    </>
                  }
                  footer={
                    <Typography variant="caption" color="text.secondary">
                      Last action · today
                    </Typography>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CivicCard
                  variant="member"
                  featured
                  header={
                    <Typography variant="overline" color="text.secondary">
                      Featured · member
                    </Typography>
                  }
                  body={
                    <>
                      <Typography variant="h6" component="p" fontWeight={700} gutterBottom>
                        Featured card
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Non-interactive — thicker border and raised elevation via the{' '}
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>featured</Typography> prop.
                      </Typography>
                    </>
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CivicCard
                  variant="ordinance"
                  body={
                    <>
                      <Typography variant="h6" component="p" fontWeight={700} gutterBottom>
                        Static card
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No <Typography component="span" sx={{ fontFamily: 'monospace' }}>href</Typography> or{' '}
                        <Typography component="span" sx={{ fontFamily: 'monospace' }}>onClick</Typography> — renders as a
                        plain container with no hover treatment.
                      </Typography>
                    </>
                  }
                />
              </Grid>
            </Grid>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Kentucky bill card
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <Typography component="span" sx={{ fontFamily: 'monospace' }}>KYBillCard</Typography> — canonical grid tile (home, browse, search).
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <KYBillCard bill={DEMO_BILL} legislators={[]} />
              </Grid>
            </Grid>
          </section>

          <section>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Other reusable modules
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Component / pattern</TableCell>
                  <TableCell>Path</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Bills browse (filters + grid)</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>components/bills/BillsBrowse.tsx</TableCell>
                  <TableCell>House / Senate / all routes; numbered pagination</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Paginated card section</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>components/ui/PaginatedSection.tsx</TableCell>
                  <TableCell>Numbered pages and/or dot gallery (responsive)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Coming soon template</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>components/ui/ComingSoonPage.tsx</TableCell>
                  <TableCell>Placeholder destinations</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Global search bar</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>app/components/Navigation.tsx</TableCell>
                  <TableCell>Submitted to <Typography component="span" sx={{ fontFamily: 'monospace' }}>/search?q=</Typography></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Federal bill card</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>components/bills/BillCard.tsx</TableCell>
                  <TableCell>Congress / legacy surfaces</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <Alert severity="info" icon={<CheckCircle />}>
            This page is excluded from search indexing. In development, a &quot;Design&quot; link appears in the main navigation.
          </Alert>
        </Stack>
      </Container>
    </Box>
  );
}
