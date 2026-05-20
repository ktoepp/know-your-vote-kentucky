'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Container as MuiContainer,
  Typography,
  Box,
  Card as MuiCard,
  CardContent as MuiCardContent,
  Chip as MuiChip,
  Divider as MuiDivider,
  Button as MuiButton,
  Avatar as MuiAvatar,
  Grid as MuiGrid,
  Tooltip as MuiTooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ArrowBack,
  OpenInNew,
  Gavel,
  Person,
  History,
  HowToVote,
  Check,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { AiGeneratedBlock } from '@/components/civic/AiAttribution';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { MemberName } from '@/components/civic/MemberName';
import { BillNumber } from '@/components/bills/BillNumber';
import { BillStatusMetaChip } from '@/components/bills/BillStatusMetaChip';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import {
  billStatusToTooltipKey,
  formatBillLabelText,
  formatLegislativeRoleLabel,
  formatRepresentativePartyChipLabel,
  formatSponsorDistrictLine,
  partyBadgeBackgroundColor,
} from '@/lib/bill-display';
import { governmentTooltips, voteCountTooltips } from '@/lib/tooltipContent';
import { getSessionTooltip } from '@/lib/ky-sessions';
import { supabase } from '@/app/lib/supabaseClient';
import {
  matchLegislatorByLegiscanId,
  matchLegislatorBySponsorName,
  memberProfilePath,
  normalizeLegislatorPhotoUrl,
  kySponsorPortraitAlt,
} from '@/lib/ky-member-utils';
import {
  legiscanRollCallPublicUrl,
  normalizeBallotpediaHref,
  httpUrlForUiLink,
  kyLrcBillDetailsUrl,
} from '@/lib/external-legislative-links';
import { CHIP, EXTERNAL_LINK_ICON_SX, ICON_REM, LINK, TYPE } from '@/lib/ui-tokens';
import { useTooltips } from '@/lib/TooltipContext';
import { BillHistoryActionText } from '@/components/bills/BillHistoryActionText';
import { FollowBillButton } from '@/components/bills/FollowBillButton';
import { BillTopicMatchHint } from '@/components/bills/BillTopicMatchHint';
const BillHearingsSection = dynamic(
  () => import('@/components/bills/BillHearingsSection').then((m) => m.BillHearingsSection),
  { ssr: false, loading: () => null },
);
import { LegislativeStageTooltip } from '@/components/ui/LegislativeStageTooltip';
import {
  legiscanActionIndicatesVetoOverride,
  legiscanHistoryIndicatesVetoOverride,
} from '@/lib/map-legiscan-bill-status';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import type { KyBillDetailEnrichment } from '@/lib/ky-bill-detail-server';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', opts ?? { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */
function SponsorCard({ sponsor, rosterPhoto }: { sponsor: LegiScanSponsor; rosterPhoto?: string | null }) {
  const theme = useTheme();
  const photo = normalizeLegislatorPhotoUrl(rosterPhoto || sponsor.bio?.social?.image);
  const memberHref = memberProfilePath({ name: sponsor.name, id: sponsor.name });
  const ballotpediaUrl = normalizeBallotpediaHref(sponsor.bio?.social?.ballotpedia ?? sponsor.ballotpedia);
  const officialProfileHref = httpUrlForUiLink(sponsor.bio?.social?.biography);
  const isPrimary = sponsor.sponsor_type_id === 1;

  return (
    <MuiCard sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <MuiCardContent>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 1.5 }}>
          <LegislatorAvatar
            src={photo || undefined}
            alt={kySponsorPortraitAlt(sponsor.name)}
            imgProps={{ referrerPolicy: 'no-referrer' }}
            party={sponsor.party}
            initials={`${sponsor.first_name?.[0] ?? ''}${sponsor.last_name?.[0] ?? ''}`}
            sx={{ width: 78, height: 78, flexShrink: 0, fontSize: '1.25rem' }}
          />
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

        {(ballotpediaUrl || officialProfileHref) && (
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
          {officialProfileHref && (
            <MuiButton
              size="medium"
              variant="outlined"
              href={officialProfileHref}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
              sx={{ fontSize: '0.9rem', py: 0.75, px: 1.5, color: 'primary.main', borderColor: 'primary.main' }}
            >
              Official profile
            </MuiButton>
          )}
        </Box>
        )}
      </MuiCardContent>
    </MuiCard>
  );
}

function HistoryTimeline({ history }: { history: LegiScanHistory[] }) {
  const theme = useTheme();
  const { tooltipsEnabled } = useTooltips();
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');

  const sorted = useMemo(() => {
    const copy = [...history].sort((a, b) => a.date.localeCompare(b.date));
    if (sortOrder === 'newest') copy.reverse();
    return copy;
  }, [history, sortOrder]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ToggleButtonGroup
          size="small"
          value={sortOrder}
          exclusive
          onChange={(_, v: 'oldest' | 'newest' | null) => {
            if (v != null) setSortOrder(v);
          }}
          aria-label="Sort legislative history by date"
        >
          <ToggleButton value="oldest" sx={{ textTransform: 'none', px: 1.5 }}>
            Oldest first
          </ToggleButton>
          <ToggleButton value="newest" sx={{ textTransform: 'none', px: 1.5 }}>
            Newest first
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
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
          <Box
            key={`${item.date}-${i}-${item.chamber}-${(item.action || '').slice(0, 48)}`}
            sx={{ display: 'flex', gap: 2, mb: isLast ? 0 : 2 }}
          >
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
              <Typography component="div" variant="body2" color={isImportant ? 'text.primary' : 'text.secondary'} fontWeight={isImportant ? 500 : 400}>
                <BillHistoryActionText text={item.action} />
                {!isImportant && tooltipsEnabled && (
                  <LegislativeStageTooltip stage="clerical" showIcon={false} position="top">
                    <Box
                      component="span"
                      sx={{ color: 'text.disabled', fontWeight: 400, cursor: 'help', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                    >
                      {' '}
                      (clerical)
                    </Box>
                  </LegislativeStageTooltip>
                )}
                {!isImportant && !tooltipsEnabled && (
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
    </Box>
  );
}

export interface BillDetailViewProps {
  bill: KYBill;
  detail: KyBillDetailEnrichment | null;
  routeId: string;
  /** Active legislators for sponsor photos and profile links (server-provided). */
  legislatorRoster: KYLegislatorRoster[];
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
export function BillDetailView({ bill, detail, routeId, legislatorRoster }: BillDetailViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const legislators = legislatorRoster;
  const [omitKyLegislatureBillLink404, setOmitKyLegislatureBillLink404] = useState(false);

  useEffect(() => {
    setOmitKyLegislatureBillLink404(false);
  }, [routeId]);

  useEffect(() => {
    if (!bill.bill_number || !bill.id) return;
    let cancelled = false;
    setOmitKyLegislatureBillLink404(false);
    const q = new URLSearchParams({ legislation: bill.bill_number });
    const sess = typeof bill.session === 'string' ? bill.session.trim() : '';
    if (sess) q.set('session', sess);
    const run = () => {
      if (cancelled) return;
      fetch(`/api/lrc/bill-link-status?${q}`)
        .then((r) => (r.ok ? r.json() : Promise.resolve({})))
        .then((d: { notFound?: boolean }) => {
          if (!cancelled && d.notFound === true) setOmitKyLegislatureBillLink404(true);
        })
        .catch(() => {});
    };
    const timer = window.setTimeout(run, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bill.id, bill.bill_number, bill.session]);

  useEffect(() => {
    if (!supabase || !bill.id) return;
    const bid = bill.id;
    const key = `kyvk_bill_view_${bid}`;
    try {
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1');
    } catch {
      /* private mode, etc. */
    }
    supabase
      .rpc('ky_increment_bill_view', { p_bill_id: bid })
      .then(({ error: rpcError }) => {
        if (rpcError) {
          try {
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
          } catch {
            /* ignore */
          }
          console.warn('[BillDetail] view count:', rpcError.message);
        }
      });
  }, [bill.id]);

  const subjects = (detail?.subjects ?? []) as LegiScanSubject[];
  const history = (detail?.history ?? []) as LegiScanHistory[];
  const texts = (detail?.texts ?? []) as LegiScanText[];
  const sponsors = (detail?.sponsors ?? []) as LegiScanSponsor[];

  // Most recent text version first
  const latestText = texts.find(t => t.type === 'Chaptered' || t.type === 'Enrolled' || t.type === 'Engrossed') ?? texts[0];
  const originalText = texts.find(t => t.type === 'Introduced');
  const officialTextForAi =
    httpUrlForUiLink(latestText?.state_link) ||
    httpUrlForUiLink(originalText?.state_link) ||
    httpUrlForUiLink(bill.bill_text_url);
  const legiscanBillDocHref = httpUrlForUiLink(bill.bill_text_url);
  const kyLegBillHref = kyLrcBillDetailsUrl(bill.bill_number, bill.session);
  const showOfficialKyBillLink = !omitKyLegislatureBillLink404;

  const primarySponsors = sponsors.filter(s => s.sponsor_type_id === 1);
  const coSponsors = sponsors.filter(s => s.sponsor_type_id !== 1);

  /**
   * Use the most recent important (importance === 1) history action to derive the
   * authoritative status. LegiScan's status *code* (stored in bill.status) can lag
   * behind the history entries, producing contradictions like "Signed by Governor"
   * when the history says "Vetoed". The history array comes fresh from the API so
   * it wins when it disagrees.
   */
  const effectiveStatus = (() => {
    if (legiscanHistoryIndicatesVetoOverride(history)) return 'Veto Override';

    if (!history.length) return bill.status;
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date) || b.importance - a.importance);
    const topImportant = sorted.find(h => h.importance === 1);
    if (!topImportant) return bill.status;
    const a = topImportant.action.toLowerCase();
    if (legiscanActionIndicatesVetoOverride(topImportant.action)) return 'Veto Override';
    if (a.includes('vetoed') || (a.includes('veto') && !a.includes('override'))) return 'Vetoed';
    if (a.includes('signed by governor') || a.includes('enacted') || a.includes('signed into law')) return 'Signed by Governor';
    if (a.includes('delivered to secretary of state')) return 'Chaptered';
    if (a.includes('became law without')) return 'Enacted';
    if (a.includes('failed') || a.includes('died')) return 'Failed';
    if (a.includes('enrolled')) return 'Enrolled';
    if (a.includes('engrossed')) return 'Engrossed';
    if (a.includes('passed') && (a.includes('house') || a.includes('senate') || a.includes('chamber'))) return 'Passed';
    return bill.status;
  })();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MuiContainer maxWidth="lg" sx={{ py: 3 }}>
        {/* Back */}
        <MuiButton
          startIcon={<ArrowBack />}
          onClick={() => router.push('/bills')}
          sx={{ mb: 2, fontSize: '1rem', fontWeight: 600 }}
        >
          Back to bills
        </MuiButton>

        {/* Header */}
        <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <MuiCardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {bill.chamber && (() => {
                const chamberKey = bill.chamber === 'house' ? 'house' : 'senate';
                const chamberTip = governmentTooltips[chamberKey];
                const chip = (
                  <MuiChip
                    label={bill.chamber === 'house' ? 'House' : 'Senate'}
                    color={bill.chamber === 'senate' ? 'secondary' : 'primary'}
                    size="medium"
                    sx={{ fontSize: '0.9rem', fontWeight: 600, '& .MuiChip-label': { px: 1.25 } }}
                  />
                );
                return chamberTip ? (
                  <MuiTooltip
                    key="chamber"
                    title={<Box sx={{ p: 0.25 }}><Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>{chamberTip.title}</Typography><Typography variant="body2">{chamberTip.content}</Typography></Box>}
                    arrow
                    enterDelay={300}
                    componentsProps={{ tooltip: { sx: { maxWidth: 340, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 4, '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}
                  >{chip}</MuiTooltip>
                ) : chip;
              })()}
              {effectiveStatus && (() => {
                const statusKey = billStatusToTooltipKey(effectiveStatus);
                const statusTip = statusKey ? governmentTooltips[statusKey] : null;
                const chip = (
                  <BillStatusMetaChip bill={bill} statusOverride={effectiveStatus} variant="detail" />
                );
                return statusTip ? (
                  <MuiTooltip
                    key="status"
                    title={<Box sx={{ p: 0.25 }}><Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>{statusTip.title}</Typography><Typography variant="body2">{statusTip.content}</Typography></Box>}
                    arrow
                    enterDelay={300}
                    componentsProps={{ tooltip: { sx: { maxWidth: 340, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 4, '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}
                  >{chip}</MuiTooltip>
                ) : chip;
              })()}
              {bill.session && (() => {
                const sessionTip = getSessionTooltip(bill.session);
                const chip = (
                  <MuiChip
                    label={formatBillLabelText(bill.session)}
                    size="medium"
                    variant="outlined"
                    sx={{ fontSize: '0.9rem', fontWeight: 600, '& .MuiChip-label': { px: 1.25 } }}
                  />
                );
                return sessionTip ? (
                  <MuiTooltip
                    title={
                      <Box sx={{ p: 0.25 }}>
                        <Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>{sessionTip.title}</Typography>
                        {sessionTip.content.split('\n\n').map((para, i) => (
                          <Typography key={i} variant="body2" display="block" sx={{ mb: i === 0 ? 0.75 : 0 }}>{para}</Typography>
                        ))}
                      </Box>
                    }
                    arrow
                    enterDelay={300}
                    componentsProps={{ tooltip: { sx: { maxWidth: 380, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 4, '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}
                  >{chip}</MuiTooltip>
                ) : chip;
              })()}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                mb: 1,
              }}
            >
              <BillNumber
                billNumber={bill.bill_number}
                size="detail"
                color="primary.main"
                sx={{ flex: '1 1 auto', minWidth: 0 }}
              />
              <FollowBillButton billId={bill.id} />
            </Box>
            <BillTopicMatchHint billId={bill.id} topics={bill.topics} legiScanSubjects={bill.legiscan_subjects ?? null} />
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
                <Typography component="div" variant="body1" fontWeight={500} sx={{ fontSize: '1.02rem' }}>
                  <BillHistoryActionText text={bill.last_action} component="div" />
                </Typography>
              </Box>
            )}

            {/* Full text + official source links */}
            {(officialTextForAi || legiscanBillDocHref || showOfficialKyBillLink) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                {officialTextForAi && (
                  <MuiButton
                    href={officialTextForAi}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew sx={{ fontSize: '0.9rem !important' }} />}
                    sx={{ fontWeight: 600, pl: 0, pr: 0.5, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                  >
                    Read the full text →
                  </MuiButton>
                )}
                {showOfficialKyBillLink && (
                  <MuiButton
                    variant="text"
                    size="small"
                    href={kyLegBillHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew sx={{ fontSize: '0.85rem !important' }} />}
                    sx={{ color: 'text.secondary', fontWeight: 500 }}
                  >
                    Kentucky Legislature
                  </MuiButton>
                )}
                {legiscanBillDocHref && (
                  <MuiButton
                    variant="text"
                    size="small"
                    href={legiscanBillDocHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    endIcon={<OpenInNew sx={{ fontSize: '0.85rem !important' }} />}
                    sx={{ color: 'text.secondary', fontWeight: 500 }}
                  >
                    LegiScan
                  </MuiButton>
                )}
              </Box>
            )}
          </MuiCardContent>
        </MuiCard>

        <MuiGrid container spacing={3}>
          {/* Left column — History */}
          <MuiGrid item xs={12} md={6}>
            {bill.ai_summary && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <AiGeneratedBlock officialHref={officialTextForAi} officialLabel="Open official bill text (PDF)">
                    {bill.ai_summary}
                  </AiGeneratedBlock>
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

          {/* Right column — Sponsors + Votes */}
          <MuiGrid item xs={12} md={6}>
            {/* Sponsors */}
            {primarySponsors.length > 0 && (
              <MuiCard elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: 'none', border: 'none' }}>
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
                    Co-sponsors ({coSponsors.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {coSponsors.map((s) => {
                      const coHref = memberProfilePath({ name: s.name, id: s.name });
                      const coBp = normalizeBallotpediaHref(s.bio?.social?.ballotpedia ?? s.ballotpedia);
                      const coPhoto = normalizeLegislatorPhotoUrl(
                        matchLegislatorByLegiscanId(legislators, s.people_id)?.photo_url ??
                          matchLegislatorBySponsorName(legislators, s.name)?.photo_url ??
                          s.bio?.social?.image,
                      );
                      return (
                      <Box key={s.people_id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <MuiAvatar
                          src={coPhoto || undefined}
                          alt={kySponsorPortraitAlt(s.name)}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{ width: 54, height: 54, flexShrink: 0 }}
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
                            <MuiChip label="Co-sponsor" size="small" color="primary" sx={CHIP.compact} />
                            {coBp && (
                              <MuiButton
                                size="small"
                                href={coBp}
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
                  {detail.votes.map((v: any, i: number) => {
                    const rollId = v.roll_call_id as number | undefined;
                    const legiscanVoteUrl =
                      rollId != null && Number.isFinite(Number(rollId))
                        ? legiscanRollCallPublicUrl(bill.bill_number, Number(rollId))
                        : null;
                    const rowKey = rollId != null ? `rc-${rollId}` : `vote-${i}`;
                    return (
                      <Box
                        key={rowKey}
                        sx={{
                          mb: i < detail.votes.length - 1 ? 1.5 : 0,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.background.default, 0.5),
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" display="block">
                          {fmtDate(v.date)}
                        </Typography>
                        <Typography variant="body2" fontWeight={500} gutterBottom>
                          {v.desc}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                          {(['yea', 'nay'] as const).map((key) => {
                            const tip = voteCountTooltips[key];
                            const chip = <MuiChip key={key} label={key === 'yea' ? `Yea: ${v.yea}` : `Nay: ${v.nay}`} size="small" color={key === 'yea' ? 'success' : 'error'} />;
                            return tip ? (
                              <MuiTooltip key={key} title={<Box sx={{ p: 0.25 }}><Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>{tip.title}</Typography><Typography variant="body2">{tip.content}</Typography></Box>} arrow enterDelay={300} componentsProps={{ tooltip: { sx: { maxWidth: 300, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 4, '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}>{chip}</MuiTooltip>
                            ) : chip;
                          })}
                          {v.nv > 0 && (() => {
                            const tip = voteCountTooltips['nv'];
                            const chip = <MuiChip label={`NV: ${v.nv}`} size="small" variant="outlined" />;
                            return tip ? (
                              <MuiTooltip title={<Box sx={{ p: 0.25 }}><Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>{tip.title}</Typography><Typography variant="body2">{tip.content}</Typography></Box>} arrow enterDelay={300} componentsProps={{ tooltip: { sx: { maxWidth: 300, bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: 4, '& .MuiTooltip-arrow': { color: 'background.paper' } } } }}>{chip}</MuiTooltip>
                            ) : chip;
                          })()}
                        </Box>
                        {legiscanVoteUrl && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <MuiButton
                              component="a"
                              size="small"
                              variant="outlined"
                              href={legiscanVoteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                            >
                              LegiScan roll call
                            </MuiButton>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </MuiCardContent>
              </MuiCard>
            )}

          </MuiGrid>
        </MuiGrid>

        <BillHearingsSection billId={bill.id} />
      </MuiContainer>
    </Box>
  );
}
