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
  ArrowBack,
  OpenInNew,
  Gavel,
  Person,
  History,
  Description,
  HowToVote,
  Check,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { AiGeneratedBlock } from '@/components/civic/AiAttribution';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { MemberName } from '@/components/civic/MemberName';
import {
  billStatusChipLabel,
  formatBillLabelText,
  formatLegislativeRoleLabel,
  formatRepresentativePartyChipLabel,
  formatSponsorDistrictLine,
  isSignedByGovernorBillStatus,
  partyBadgeBackgroundColor,
} from '@/lib/bill-display';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYLegislatorRoster } from '@/types/kentucky';
import {
  matchLegislatorByLegiscanId,
  matchLegislatorBySponsorName,
  memberProfilePath,
  normalizeLegislatorPhotoUrl,
} from '@/lib/ky-member-utils';
import { CHIP, EXTERNAL_LINK_ICON_SX, ICON_REM, LINK, TYPE } from '@/lib/ui-tokens';

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
function SponsorCard({ sponsor, rosterPhoto }: { sponsor: LegiScanSponsor; rosterPhoto?: string | null }) {
  const theme = useTheme();
  const photo = normalizeLegislatorPhotoUrl(rosterPhoto || sponsor.bio?.social?.image);
  const memberHref = memberProfilePath({ name: sponsor.name, id: sponsor.name });
  const ballotpediaUrl = sponsor.bio?.social?.ballotpedia || (sponsor.ballotpedia ? `https://ballotpedia.org/${sponsor.ballotpedia}` : null);
  const kyProfileUrl = sponsor.bio?.social?.biography;
  const isPrimary = sponsor.sponsor_type_id === 1;

  return (
    <MuiCard sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <MuiCardContent>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
          <MuiAvatar
            src={photo || undefined}
            imgProps={{ referrerPolicy: 'no-referrer' }}
            sx={{ width: 52, height: 52, flexShrink: 0 }}
          >
            {sponsor.first_name?.[0]}{sponsor.last_name?.[0]}
          </MuiAvatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              noWrap
              component={NextLink}
              href={memberHref}
              sx={{
                fontSize: LINK.fontSize,
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              <MemberName member={sponsor} variant="primary" />
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              <MuiChip
                component={NextLink}
                href={memberHref}
                clickable
                label={formatRepresentativePartyChipLabel(sponsor.party)}
                size="small"
                sx={{ ...CHIP.compact, bgcolor: partyBadgeBackgroundColor(sponsor.party), color: '#fff' }}
              />
              {sponsor.role ? (
                <MuiChip
                  label={formatLegislativeRoleLabel(sponsor.role)}
                  size="small"
                  variant="outlined"
                  sx={CHIP.compact}
                />
              ) : null}
              {isPrimary && (
                <MuiChip label="Primary sponsor" size="small" color="primary" sx={CHIP.compact} />
              )}
            </Box>
          </Box>
        </Box>

        {sponsor.district && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {formatSponsorDistrictLine(sponsor.district)}
          </Typography>
        )}
        {sponsor.bio?.social?.email && (
          <Box sx={{ mb: 0.5 }}>
            <CopyableEmail email={sponsor.bio.social.email} />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          {ballotpediaUrl && (
            <MuiButton
              size="medium"
              variant="contained"
              href={ballotpediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
              sx={{ fontSize: '0.9rem', py: 0.75, px: 1.5 }}
            >
              Ballotpedia
            </MuiButton>
          )}
          {kyProfileUrl && (
            <MuiButton
              size="medium"
              variant="outlined"
              href={kyProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
              sx={{ fontSize: '0.9rem', py: 0.75, px: 1.5, color: 'primary.main', borderColor: 'primary.main' }}
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
        /** LegiScan `importance === 1` marks major steps; both use solid fills (blue vs neutral grey). */
        const pinBg = isImportant
          ? theme.palette.primary.main
          : theme.palette.mode === 'dark'
            ? theme.palette.grey[600]
            : theme.palette.grey[500];
        const pinBorder = isImportant
          ? theme.palette.primary.dark
          : theme.palette.mode === 'dark'
            ? theme.palette.grey[500]
            : theme.palette.grey[600];
        return (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%', mt: 0.6,
                bgcolor: pinBg,
                border: `2px solid ${pinBorder}`,
                boxSizing: 'border-box',
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
                {formatBillLabelText(item.action)}
                {!isImportant && (
                  <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>
                    {' '}
                    (clerical)
                  </Box>
                )}
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
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('ky_legislators')
      .select('id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url')
      .eq('active', true)
      .then(({ data }) => {
        if (!cancelled) setLegislators(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bills/${encodeURIComponent(id)}`, {
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(res.status === 404 ? 'Bill not found' : 'Failed to load bill');
        const json = await res.json();
        setBill(json.bill);
        setDetail(json.detail);
      } catch (err: any) {
        const name = err?.name;
        const msg = err?.message || '';
        if (name === 'AbortError' || name === 'TimeoutError' || /aborted|timeout/i.test(msg)) {
          setError('Request timed out while loading this bill. Try again in a moment.');
        } else {
          setError(err.message || 'Failed to load bill');
        }
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
  const officialTextForAi = latestText?.state_link || originalText?.state_link || bill.bill_text_url || null;

  const primarySponsors = sponsors.filter(s => s.sponsor_type_id === 1);
  const coSponsors = sponsors.filter(s => s.sponsor_type_id !== 1);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MuiContainer maxWidth="lg" sx={{ py: 3 }}>
        {/* Back */}
        <MuiButton
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}
        >
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
                  size="medium"
                  sx={{ fontSize: '0.9rem', fontWeight: 600, '& .MuiChip-label': { px: 1.25 } }}
                />
              )}
              {bill.status &&
                (isSignedByGovernorBillStatus(bill.status) ? (
                  <MuiChip
                    icon={<Check sx={{ fontSize: '1.125rem !important' }} />}
                    label={billStatusChipLabel(bill.status)}
                    size="medium"
                    color="success"
                    variant="outlined"
                    sx={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'success.main',
                      borderColor: 'success.main',
                      '& .MuiChip-label': { px: 1.25 },
                      '& .MuiChip-icon': { color: 'success.main' },
                    }}
                  />
                ) : (
                  <MuiChip
                    label={formatBillLabelText(bill.status)}
                    size="medium"
                    color={statusColor(bill.status)}
                    sx={{ fontSize: '0.9rem', fontWeight: 600, '& .MuiChip-label': { px: 1.25 } }}
                  />
                ))}
              {bill.session && (
                <MuiChip
                  label={formatBillLabelText(bill.session)}
                  size="medium"
                  variant="outlined"
                  sx={{ fontSize: '0.9rem', fontWeight: 600, '& .MuiChip-label': { px: 1.25 } }}
                />
              )}
            </Box>

            <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>
              {bill.bill_number}
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              fontWeight={700}
              color="text.primary"
              sx={{
                mb: 2,
                lineHeight: 1.3,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
              }}
            >
              {bill.title}
            </Typography>

            {bill.description && (
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2, fontSize: '1.05rem' }}>
                {bill.description}
              </Typography>
            )}

            {/* Subject tags */}
            {subjects.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                {subjects.map((s) => (
                  <MuiChip
                    key={s.subject_id}
                    component={NextLink}
                    href={`/search?q=${encodeURIComponent(s.subject_name)}`}
                    clickable
                    label={s.subject_name}
                    size="medium"
                    variant="outlined"
                    sx={{ fontSize: '0.875rem', fontWeight: 500, '& .MuiChip-label': { px: 1.25 } }}
                  />
                ))}
              </Box>
            )}

            {/* Meta row */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {bill.introduced_date && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                  Introduced: {fmtDate(bill.introduced_date)}
                </Typography>
              )}
              {bill.last_action_date && (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                  Last action: {fmtDate(bill.last_action_date)}
                </Typography>
              )}
            </Box>

            {bill.last_action && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                <Typography variant="body1" fontWeight={500} sx={{ fontSize: '1.02rem' }}>
                  {formatBillLabelText(bill.last_action)}
                </Typography>
              </Box>
            )}
          </MuiCardContent>
        </MuiCard>

        <MuiGrid container spacing={3}>
          {/* Left column */}
          <MuiGrid item xs={12} md={8}>
            {bill.ai_summary && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <AiGeneratedBlock officialHref={officialTextForAi} officialLabel="Open official bill text (PDF)">
                    {bill.ai_summary}
                  </AiGeneratedBlock>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Bill Text */}
            {texts.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Description color="primary" sx={{ fontSize: ICON_REM.section }} />
                    <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight}>Bill Text</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: latestText?.state_link ? 2 : 0 }}>
                    {latestText?.state_link && (
                      <MuiButton
                        variant="contained"
                        href={latestText.state_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                        sx={{ fontSize: '1rem', py: 1, px: 2 }}
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
                        endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                        sx={{ fontSize: '1rem', py: 1, px: 2 }}
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
                            sx={{ fontSize: '0.875rem', minWidth: 0, px: 1, py: 0.35, ml: 0.5 }}
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
                    <History color="primary" sx={{ fontSize: ICON_REM.section }} />
                    <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight}>Legislative History</Typography>
                    <MuiChip label={`${history.length} actions`} size="small" variant="outlined" sx={{ ml: 'auto' }} />
                  </Box>
                  <HistoryTimeline history={history} />
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
                    <Person color="primary" sx={{ fontSize: ICON_REM.section }} />
                    <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight}>
                      {primarySponsors.length === 1 ? 'Primary Sponsor' : 'Primary Sponsors'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {primarySponsors.map((s) => (
                      <SponsorCard
                        key={s.people_id}
                        sponsor={s}
                        rosterPhoto={
                          normalizeLegislatorPhotoUrl(
                            matchLegislatorByLegiscanId(legislators, s.people_id)?.photo_url ??
                              matchLegislatorBySponsorName(legislators, s.name)?.photo_url,
                          )
                        }
                      />
                    ))}
                  </Box>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Co-sponsors */}
            {coSponsors.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight} gutterBottom>
                    Co-Sponsors ({coSponsors.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {coSponsors.map((s) => {
                      const coHref = memberProfilePath({ name: s.name, id: s.name });
                      const coPhoto = normalizeLegislatorPhotoUrl(
                        matchLegislatorByLegiscanId(legislators, s.people_id)?.photo_url ??
                          matchLegislatorBySponsorName(legislators, s.name)?.photo_url ??
                          s.bio?.social?.image,
                      );
                      return (
                      <Box key={s.people_id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <MuiAvatar
                          src={coPhoto || undefined}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{ width: 36, height: 36, flexShrink: 0 }}
                        >
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </MuiAvatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            component={NextLink}
                            href={coHref}
                            sx={{
                              fontSize: LINK.fontSize,
                              fontWeight: 600,
                              color: 'inherit',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            noWrap
                          >
                            {s.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap', alignItems: 'center' }}>
                            <MuiChip
                              component={NextLink}
                              href={coHref}
                              clickable
                              label={formatRepresentativePartyChipLabel(s.party)}
                              size="small"
                              sx={{ ...CHIP.compact, bgcolor: partyBadgeBackgroundColor(s.party), color: '#fff' }}
                            />
                            <MuiChip label="Co sponsor" size="small" color="primary" sx={CHIP.compact} />
                            {s.bio?.social?.ballotpedia && (
                              <MuiButton
                                size="small"
                                href={s.bio.social.ballotpedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                                sx={{ fontSize: '0.875rem', py: 0.5, px: 1, minWidth: 0, lineHeight: 1.2 }}
                              >
                                Ballotpedia
                              </MuiButton>
                            )}
                          </Box>
                        </Box>
                      </Box>
                      );
                    })}
                  </Box>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Votes summary */}
            {detail?.votes && detail.votes.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <HowToVote color="primary" sx={{ fontSize: ICON_REM.section }} />
                    <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight}>Votes</Typography>
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
                <Typography variant={TYPE.cardTitle.variant} fontWeight={TYPE.cardTitle.fontWeight} gutterBottom>Official Sources</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {bill.bill_text_url && (
                    <MuiButton
                      variant="outlined"
                      fullWidth
                      href={bill.bill_text_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                      size="medium"
                      sx={{ color: 'primary.main', borderColor: 'primary.main', fontSize: '1rem', py: 1.25 }}
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
                    endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                    size="medium"
                    sx={{ color: 'primary.main', borderColor: 'primary.main', fontSize: '1rem', py: 1.25 }}
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
