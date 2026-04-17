'use client';

import React, { useState, useEffect } from 'react';
import {
  Container as MuiContainer,
  Typography,
  Box,
  Card as MuiCard,
  CardContent as MuiCardContent,
  Chip as MuiChip,
  Divider as MuiDivider,
  Button as MuiButton,
  Alert as MuiAlert,
  CircularProgress,
  Avatar as MuiAvatar,
  Grid as MuiGrid,
} from '@mui/material';
import {
  ArrowBack, OpenInNew, Gavel, Person, History,
  Label, Description, HowToVote, CheckCircle, RadioButtonUnchecked,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
interface KYBill {
  id: string;
  bill_number: string;
  title: string;
  description: string | null;
  ai_summary: string | null;
  session: string | null;
  chamber: 'house' | 'senate' | null;
  status: string | null;
  introduced_date: string | null;
  last_action_date: string | null;
  last_action: string | null;
  bill_text_url: string | null;
  topics: string[] | null;
  sponsors: any;
  legiscan_id: number | null;
}

interface LegiScanSponsor {
  people_id: number;
  name: string;
  first_name: string;
  last_name: string;
  party: string;
  role: string;
  district: string;
  sponsor_type_id: number; // 1=primary, 2=cosponsor
  bio?: {
    social?: {
      ballotpedia?: string;
      image?: string;
      email?: string;
      capitol_phone?: string;
      biography?: string;
    };
  };
  ballotpedia?: string;
}

interface LegiScanHistory {
  date: string;
  action: string;
  chamber: string;
  importance: number;
}

interface LegiScanText {
  doc_id: number;
  type: string;
  mime: string;
  url: string;
  state_link: string;
}

interface LegiScanSubject {
  subject_id: number;
  subject_name: string;
}

interface BillDetail {
  subjects: LegiScanSubject[];
  history: LegiScanHistory[];
  texts: LegiScanText[];
  sponsors: LegiScanSponsor[];
  votes: any[];
  committee: any;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', opts ?? { month: 'long', day: 'numeric', year: 'numeric' });
}

function memberSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function partyColor(party: string) {
  if (party === 'D') return '#1565c0';
  if (party === 'R') return '#c62828';
  return '#555';
}

function statusColor(status: string | null): 'success' | 'warning' | 'error' | 'default' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s.includes('signed') || s.includes('passed') || s.includes('chaptered')) return 'success';
  if (s.includes('veto') || s.includes('failed')) return 'error';
  if (s.includes('committee') || s.includes('engrossed') || s.includes('enrolled')) return 'warning';
  return 'default';
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */
function SponsorCard({ sponsor }: { sponsor: LegiScanSponsor }) {
  const theme = useTheme();
  const photo = sponsor.bio?.social?.image;
  const ballotpediaUrl = sponsor.bio?.social?.ballotpedia || (sponsor.ballotpedia ? `https://ballotpedia.org/${sponsor.ballotpedia}` : null);
  const kyProfileUrl = sponsor.bio?.social?.biography;
  const isPrimary = sponsor.sponsor_type_id === 1;

  return (
    <MuiCard sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <MuiCardContent>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
          <MuiAvatar src={photo} sx={{ width: 52, height: 52, flexShrink: 0 }}>
            {sponsor.first_name?.[0]}{sponsor.last_name?.[0]}
          </MuiAvatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{sponsor.name}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              <MuiChip
                label={sponsor.party}
                size="small"
                sx={{ bgcolor: partyColor(sponsor.party), color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 20 }}
              />
              <MuiChip label={sponsor.role} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
              {isPrimary && <MuiChip label="Primary" size="small" color="primary" sx={{ fontSize: '0.7rem', height: 20 }} />}
            </Box>
          </Box>
        </Box>

        {sponsor.district && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            District: {sponsor.district.replace('HD-', 'House Dist. ').replace('SD-', 'Senate Dist. ')}
          </Typography>
        )}
        {sponsor.bio?.social?.email && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, wordBreak: 'break-all' }}>
            {sponsor.bio.social.email}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          {ballotpediaUrl && (
            <MuiButton
              size="small"
              variant="contained"
              href={ballotpediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNew sx={{ fontSize: '0.8rem !important' }} />}
              sx={{ fontSize: '0.7rem', py: 0.25 }}
            >
              Ballotpedia
            </MuiButton>
          )}
          {kyProfileUrl && (
            <MuiButton
              size="small"
              variant="outlined"
              href={kyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNew sx={{ fontSize: '0.8rem !important' }} />}
              sx={{ fontSize: '0.7rem', py: 0.25, color: 'primary.main', borderColor: 'primary.main' }}
            >
              KY Profile
            </MuiButton>
          )}
        </Box>
      </MuiCardContent>
    </MuiCard>
  );
}

function HistoryTimeline({ history }: { history: LegiScanHistory[] }) {
  const theme = useTheme();
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Box sx={{ pl: 0 }}>
      {sorted.map((item, i) => {
        const isLast = i === sorted.length - 1;
        const isImportant = item.importance === 1;
        return (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%', mt: 0.6,
                bgcolor: isImportant ? theme.palette.primary.main : theme.palette.divider,
                border: `2px solid ${isImportant ? theme.palette.primary.main : theme.palette.text.disabled}`,
              }} />
              {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: theme.palette.divider, mt: 0.5 }} />}
            </Box>
            <Box sx={{ pb: isLast ? 0 : 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
                {fmtDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {item.chamber === 'H' ? 'House' : item.chamber === 'S' ? 'Senate' : item.chamber}
                </Box>
              </Typography>
              <Typography variant="body2" color={isImportant ? 'text.primary' : 'text.secondary'} fontWeight={isImportant ? 500 : 400}>
                {item.action}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const theme = useTheme();
  const { id } = React.use(params);

  const [bill, setBill] = useState<KYBill | null>(null);
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bills/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(res.status === 404 ? 'Bill not found' : 'Failed to load bill');
        const json = await res.json();
        setBill(json.bill);
        setDetail(json.detail);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !bill) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <MuiContainer maxWidth="lg" sx={{ py: 4 }}>
          <MuiAlert severity={error === 'Bill not found' ? 'warning' : 'error'} sx={{ mb: 2 }}>{error || 'Bill not found'}</MuiAlert>
          <MuiButton startIcon={<ArrowBack />} onClick={() => router.back()}>Go Back</MuiButton>
        </MuiContainer>
      </Box>
    );
  }

  const subjects = detail?.subjects ?? [];
  const history = detail?.history ?? [];
  const texts = detail?.texts ?? [];
  const sponsors = detail?.sponsors ?? [];

  // Most recent text version first
  const latestText = texts.find(t => t.type === 'Chaptered' || t.type === 'Enrolled' || t.type === 'Engrossed') ?? texts[0];
  const originalText = texts.find(t => t.type === 'Introduced');

  const primarySponsors = sponsors.filter(s => s.sponsor_type_id === 1);
  const coSponsors = sponsors.filter(s => s.sponsor_type_id !== 1);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MuiContainer maxWidth="lg" sx={{ py: 3 }}>
        {/* Back */}
        <MuiButton startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
          Bills
        </MuiButton>

        {/* Header */}
        <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <MuiCardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {bill.chamber && (
                <MuiChip
                  label={bill.chamber === 'house' ? 'House' : 'Senate'}
                  color={bill.chamber === 'senate' ? 'secondary' : 'primary'}
                  size="small"
                />
              )}
              {bill.status && (
                <MuiChip label={bill.status} size="small" color={statusColor(bill.status)} />
              )}
              {bill.session && (
                <MuiChip label={bill.session} size="small" variant="outlined" />
              )}
            </Box>

            <Typography variant="h4" fontWeight={700} gutterBottom color="primary.main">
              {bill.bill_number}
            </Typography>
            <Typography variant="h6" fontWeight={400} color="text.primary" sx={{ mb: 2, lineHeight: 1.4 }}>
              {bill.title}
            </Typography>

            {/* Subject tags */}
            {subjects.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                <Label sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5, mt: 0.25 }} />
                {subjects.map(s => (
                  <MuiChip key={s.subject_id} label={s.subject_name} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                ))}
              </Box>
            )}

            {/* Meta row */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {bill.introduced_date && (
                <Typography variant="caption" color="text.secondary">
                  Introduced: {fmtDate(bill.introduced_date)}
                </Typography>
              )}
              {bill.last_action_date && (
                <Typography variant="caption" color="text.secondary">
                  Last action: {fmtDate(bill.last_action_date)}
                </Typography>
              )}
            </Box>

            {bill.last_action && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                <Typography variant="body2" fontWeight={500}>{bill.last_action}</Typography>
              </Box>
            )}
          </MuiCardContent>
        </MuiCard>

        <MuiGrid container spacing={3}>
          {/* Left column */}
          <MuiGrid item xs={12} md={8}>

            {/* Bill Text */}
            {texts.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Description color="primary" />
                    <Typography variant="h6" fontWeight={700}>Bill Text</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: latestText?.state_link ? 2 : 0 }}>
                    {latestText?.state_link && (
                      <MuiButton
                        variant="contained"
                        href={latestText.state_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNew />}
                      >
                        {latestText.type} Version (PDF)
                      </MuiButton>
                    )}
                    {originalText?.state_link && latestText?.doc_id !== originalText?.doc_id && (
                      <MuiButton
                        variant="outlined"
                        href={originalText.state_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNew />}
                      >
                        Introduced Version (PDF)
                      </MuiButton>
                    )}
                  </Box>
                  {/* All versions */}
                  {texts.length > 1 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        All versions: {texts.map(t => (
                          <MuiButton
                            key={t.doc_id}
                            href={t.state_link || t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            size="small"
                            sx={{ fontSize: '0.7rem', minWidth: 0, px: 0.75, py: 0, ml: 0.5 }}
                          >
                            {t.type}
                          </MuiButton>
                        ))}
                      </Typography>
                    </Box>
                  )}
                </MuiCardContent>
              </MuiCard>
            )}

            {/* History */}
            {history.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                    <History color="primary" />
                    <Typography variant="h6" fontWeight={700}>Legislative History</Typography>
                    <MuiChip label={`${history.length} actions`} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                  </Box>
                  <HistoryTimeline history={history} />
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Description */}
            {bill.description && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>Full Description</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {bill.description}
                  </Typography>
                </MuiCardContent>
              </MuiCard>
            )}
          </MuiGrid>

          {/* Right column */}
          <MuiGrid item xs={12} md={4}>
            {/* Sponsors */}
            {primarySponsors.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Person color="primary" />
                    <Typography variant="h6" fontWeight={700}>
                      {primarySponsors.length === 1 ? 'Primary Sponsor' : 'Primary Sponsors'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {primarySponsors.map(s => <SponsorCard key={s.people_id} sponsor={s} />)}
                  </Box>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Co-sponsors */}
            {coSponsors.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Co-Sponsors ({coSponsors.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {coSponsors.map(s => (
                      <Box key={s.people_id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <MuiAvatar src={s.bio?.social?.image} sx={{ width: 36, height: 36, flexShrink: 0 }}>
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </MuiAvatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            component={NextLink}
                            href={`/members#${memberSlug(s.name)}`}
                            sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                            noWrap
                          >
                            {s.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                            <MuiChip label={s.party} size="small" sx={{ bgcolor: partyColor(s.party), color: '#fff', fontSize: '0.65rem', height: 18 }} />
                            {s.bio?.social?.ballotpedia && (
                              <MuiButton
                                size="small"
                                href={s.bio.social.ballotpedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                endIcon={<OpenInNew sx={{ fontSize: '0.65rem !important' }} />}
                                sx={{ fontSize: '0.65rem', py: 0, px: 0.5, minWidth: 0, lineHeight: 1.2 }}
                              >
                                Ballotpedia
                              </MuiButton>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Votes summary */}
            {detail?.votes && detail.votes.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <HowToVote color="primary" />
                    <Typography variant="h6" fontWeight={700}>Votes</Typography>
                  </Box>
                  {detail.votes.map((v: any, i: number) => (
                    <Box key={i} sx={{ mb: i < detail.votes.length - 1 ? 1.5 : 0, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.background.default, 0.5), border: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" color="text.secondary" display="block">{fmtDate(v.date)}</Typography>
                      <Typography variant="body2" fontWeight={500} gutterBottom>{v.desc}</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <MuiChip label={`Yea: ${v.yea}`} size="small" color="success" />
                        <MuiChip label={`Nay: ${v.nay}`} size="small" color="error" />
                        {v.nv > 0 && <MuiChip label={`NV: ${v.nv}`} size="small" variant="outlined" />}
                      </Box>
                    </Box>
                  ))}
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Official links */}
            <MuiCard sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
              <MuiCardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>Official Sources</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {bill.bill_text_url && (
                    <MuiButton
                      variant="outlined"
                      fullWidth
                      href={bill.bill_text_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNew />}
                      size="small"
                      sx={{ color: 'primary.main', borderColor: 'primary.main' }}
                    >
                      View on LegiScan
                    </MuiButton>
                  )}
                  <MuiButton
                    variant="outlined"
                    fullWidth
                    href={`https://legislature.ky.gov/Legislation/Pages/bill-details.aspx?legislation=${encodeURIComponent(bill.bill_number)}&session=${encodeURIComponent(bill.session || '2026 RS')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew />}
                    size="small"
                    sx={{ color: 'primary.main', borderColor: 'primary.main' }}
                  >
                    KY Legislature
                  </MuiButton>
                </Box>
              </MuiCardContent>
            </MuiCard>
          </MuiGrid>
        </MuiGrid>
      </MuiContainer>
    </Box>
  );
}
