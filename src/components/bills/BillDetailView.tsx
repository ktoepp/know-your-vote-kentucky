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
  Grid as MuiGrid,
  Link as MuiLink,
  Tooltip as MuiTooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  ArrowBack,
  OpenInNew,
  Gavel,
  Check,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { AiGeneratedBlock } from '@/components/civic/AiAttribution';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { LegislatorExternalLinkButton } from '@/components/civic/LegislatorExternalLinkButton';
import { LegislatorIdentityBlock } from '@/components/civic/LegislatorIdentityBlock';
import { MemberName } from '@/components/civic/MemberName';
import { BillNumber } from '@/components/bills/BillNumber';
import { BillStatusMetaChip } from '@/components/bills/BillStatusMetaChip';
import { ChamberChip, MetaChip } from '@/components/ui/Chip';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { legislatorRoleDistrictLineFromSponsor } from '@/lib/legislator-display';
import {
  formatBillLabelText,
} from '@/lib/bill-display';
import { governmentTooltips, voteCountTooltips } from '@/lib/tooltipContent';
import { voteBucketChipColor, voteBucketLabel } from '@/lib/vote-display';
import { getSessionTooltip } from '@/lib/ky-sessions';
import { formatCivicDate } from '@/lib/civic-date';
import { supabase } from '@/app/lib/supabaseClient';
import {
  kyLegislatorAvatarInitials,
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
import { CHIP, EXTERNAL_LINK_ICON_SX, ICON_REM, TYPE } from '@/lib/ui-tokens';
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
import { getKyEnactedBillEffectiveDateNotice } from '@/lib/ky-bill-effective-date';
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
  /** LegiScan getBill texts[] includes the document date; older synced rows may lack it. */
  date?: string;
}

/** Friendly labels for LegiScan texts[] type values; unknown types render as-is. */
const TEXT_TYPE_LABELS: Record<string, string> = {
  Introduced: 'Introduced (original)',
  'Comm Sub': 'Committee Substitute',
  Amended: 'Amended',
  Engrossed: 'Engrossed (passed one chamber)',
  Enrolled: 'Enrolled (passed both chambers)',
  Chaptered: 'Enacted — Acts chapter (final law)',
  Draft: 'Draft',
};

/** KY texts[] ship date "0000-00-00"; treat anything non-real as missing. */
function textDateOrNull(date: string | undefined): string | null {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !date.startsWith('0000') ? date : null;
}

interface LegiScanSubject {
  subject_id: number;
  subject_name: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */
function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  return formatCivicDate(d, opts);
}

function rollCallChamberFromDesc(desc: string | null | undefined): 'H' | 'S' | null {
  const d = (desc ?? '').trim().toLowerCase();
  if (d.startsWith('house')) return 'H';
  if (d.startsWith('senate')) return 'S';
  return null;
}

/**
 * LegiScan's KY roll-call `desc` is unreliable: every House roll call comes back
 * "House: Veto Override RCS# N" and every Senate one "Senate: Third Reading RSN# N",
 * regardless of the actual vote. Derive a trustworthy label from the action history
 * (which embeds the true action + tally) by matching chamber + yea-nay. The "House:"/
 * "Senate:" prefix on `desc` is the only reliable part, so we keep the chamber.
 */
function deriveRollCallLabel(
  v: { desc?: string | null; yea?: number; nay?: number; date?: string },
  history: LegiScanHistory[],
): string {
  const chamber = rollCallChamberFromDesc(v.desc);
  const chamberLabel = chamber === 'H' ? 'House' : chamber === 'S' ? 'Senate' : '';
  const yea = Number(v.yea);
  const nay = Number(v.nay);
  if (Number.isFinite(yea) && Number.isFinite(nay)) {
    const tally = `${yea}-${nay}`;
    const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
    const matches = history.filter(
      (h) => (!chamber || !h.chamber || h.chamber === chamber) && h.action && norm(h.action).includes(tally),
    );
    const best = matches.find((h) => h.date === v.date) ?? matches[0];
    if (best) {
      const action = best.action.trim();
      const pretty = action.charAt(0).toUpperCase() + action.slice(1);
      return chamberLabel ? `${chamberLabel}: ${pretty}` : pretty;
    }
  }
  return chamberLabel ? `${chamberLabel} floor vote` : 'Floor vote';
}

/** ky_votes row as mapped by fetchDbVotes (ky-bill-detail-server). */
interface BillVoteRow {
  roll_call_id?: number;
  date?: string | null;
  desc?: string | null;
  yea?: number;
  nay?: number;
  nv?: number;
  absent?: number;
  passed?: boolean | null;
}

/**
 * Attach each roll call to the history entry it belongs to, mirroring
 * deriveRollCallLabel's chamber + "yea-nay" tally match (same-date entry wins).
 * Votes with no matching entry are returned separately so the timeline can
 * synthesize a dated row for them instead of dropping them.
 */
function matchVotesToHistory(
  votes: BillVoteRow[],
  history: LegiScanHistory[],
): { attached: Map<number, BillVoteRow[]>; unmatched: BillVoteRow[] } {
  const attached = new Map<number, BillVoteRow[]>();
  const unmatched: BillVoteRow[] = [];
  const norm = (s: string) => s.replace(/\s+/g, ' ').toLowerCase();
  for (const v of votes) {
    const chamber = rollCallChamberFromDesc(v.desc);
    const yea = Number(v.yea);
    const nay = Number(v.nay);
    let idx = -1;
    if (Number.isFinite(yea) && Number.isFinite(nay)) {
      const tally = `${yea}-${nay}`;
      const candidates: number[] = [];
      history.forEach((h, i) => {
        if ((!chamber || !h.chamber || h.chamber === chamber) && h.action && norm(h.action).includes(tally)) {
          candidates.push(i);
        }
      });
      idx = candidates.find((i) => history[i]!.date === v.date) ?? candidates[0] ?? -1;
    }
    if (idx >= 0) attached.set(idx, [...(attached.get(idx) ?? []), v]);
    else unmatched.push(v);
  }
  return { attached, unmatched };
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */
/**
 * One count chip in a roll-call summary (Yea / Nay / Not voting / Absent),
 * wrapped in the civic tooltip explaining how that vote type counts toward
 * passage. Yea/Nay are filled; the non-vote types are outlined so the
 * decisive counts stay visually primary.
 */
function VoteCountChip({ bucket, count }: { bucket: 'yea' | 'nay' | 'nv' | 'absent'; count: number }) {
  const chip = (
    <MuiChip
      label={`${voteBucketLabel(bucket)}: ${count}`}
      size="small"
      color={voteBucketChipColor(bucket)}
      variant={bucket === 'yea' || bucket === 'nay' ? 'filled' : 'outlined'}
    />
  );
  const tip = voteCountTooltips[bucket];
  if (!tip) return chip;
  return (
    <MuiTooltip
      title={
        <Box sx={{ p: 0.25 }}>
          <Typography variant="caption" display="block" sx={{ fontWeight: 700, mb: 0.5 }}>
            {tip.title}
          </Typography>
          <Typography variant="body2">{tip.content}</Typography>
        </Box>
      }
      arrow
      enterDelay={300}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: 300,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 4,
            '& .MuiTooltip-arrow': { color: 'background.paper' },
          },
        },
      }}
    >
      {chip}
    </MuiTooltip>
  );
}

/**
 * Proportional roll-call tally bar. Segment order is fixed — Yea anchored left,
 * Nay anchored right, Not voting / Absent between — so the green and red segments
 * are never adjacent (keeps the bar legible under color-vision deficiency; the
 * printed counts below remain the primary encoding).
 */
function VoteTallyBar({ yea, nay, nv, absent }: { yea: number; nay: number; nv: number; absent: number }) {
  const theme = useTheme();
  const total = yea + nay + nv + absent;
  if (total <= 0) return null;
  const segments = [
    { key: 'yea', count: yea, color: theme.palette.success.main, label: 'Yea' },
    { key: 'nv', count: nv, color: theme.palette.warning.main, label: 'Not voting' },
    { key: 'absent', count: absent, color: theme.palette.grey[theme.palette.mode === 'dark' ? 400 : 500], label: 'Absent' },
    { key: 'nay', count: nay, color: theme.palette.error.main, label: 'Nay' },
  ].filter((s) => s.count > 0);
  return (
    <Box
      role="img"
      aria-label={`${yea} yea, ${nv} not voting, ${absent} absent, ${nay} nay`}
      sx={{ display: 'flex', gap: '2px', height: 11, borderRadius: '5px', overflow: 'hidden' }}
    >
      {segments.map((s) => (
        <MuiTooltip key={s.key} title={`${s.label} · ${s.count}`} arrow enterDelay={200}>
          <Box sx={{ flexGrow: s.count, flexBasis: 0, minWidth: '3px', bgcolor: s.color }} />
        </MuiTooltip>
      ))}
    </Box>
  );
}

/**
 * A roll call rendered inline in the legislative-history timeline: tally bar,
 * the existing count chips (keeping their civic tooltips), and a quiet LegiScan
 * source link. `showOutcome` adds a Passed/Failed chip for synthesized rows whose
 * action text doesn't already state the result; it renders only when `passed`
 * is present in the data — never computed from a threshold.
 */
function InlineRollCall({
  vote,
  billNumber,
  showOutcome = false,
}: {
  vote: BillVoteRow;
  billNumber: string;
  showOutcome?: boolean;
}) {
  const theme = useTheme();
  const rollId = vote.roll_call_id;
  const legiscanVoteUrl =
    rollId != null && Number.isFinite(Number(rollId))
      ? legiscanRollCallPublicUrl(billNumber, Number(rollId))
      : null;
  return (
    <Box
      sx={{
        mt: 1,
        p: 1.25,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.default, 0.5),
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <VoteTallyBar yea={vote.yea ?? 0} nay={vote.nay ?? 0} nv={vote.nv ?? 0} absent={vote.absent ?? 0} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {showOutcome && vote.passed != null && (
          <MuiChip
            size="small"
            label={vote.passed ? 'Passed' : 'Failed'}
            color={vote.passed ? 'success' : 'error'}
            variant="filled"
          />
        )}
        <VoteCountChip bucket="yea" count={vote.yea ?? 0} />
        <VoteCountChip bucket="nay" count={vote.nay ?? 0} />
        {(vote.nv ?? 0) > 0 && <VoteCountChip bucket="nv" count={vote.nv ?? 0} />}
        {(vote.absent ?? 0) > 0 && <VoteCountChip bucket="absent" count={vote.absent ?? 0} />}
      </Box>
      {legiscanVoteUrl && (
        <MuiLink
          href={legiscanVoteUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LegiScan roll call (opens in a new tab)"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'text.secondary',
            textDecoration: 'none',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          LegiScan roll call
          <OpenInNew sx={EXTERNAL_LINK_ICON_SX} aria-hidden />
        </MuiLink>
      )}
    </Box>
  );
}

function SponsorCard({
  sponsor,
  rosterPhoto,
  legislators,
}: {
  sponsor: LegiScanSponsor;
  rosterPhoto?: string | null;
  legislators: KYLegislatorRoster[];
}) {
  const theme = useTheme();
  const photo = normalizeLegislatorPhotoUrl(rosterPhoto || sponsor.bio?.social?.image);
  const memberHref = memberProfilePath({ name: sponsor.name, id: sponsor.name });
  const ballotpediaUrl = normalizeBallotpediaHref(sponsor.bio?.social?.ballotpedia ?? sponsor.ballotpedia);
  const officialProfileHref = httpUrlForUiLink(sponsor.bio?.social?.biography);
  const isPrimary = sponsor.sponsor_type_id === 1;
  const roleLine = legislatorRoleDistrictLineFromSponsor(sponsor, legislators);

  return (
    <MuiCard sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
      <MuiCardContent>
        <LegislatorIdentityBlock
          name={<MemberName member={sponsor} variant="primary" />}
          nameHref={memberHref}
          roleLine={roleLine}
          density="detail"
          avatar={{
            src: photo || undefined,
            alt: kySponsorPortraitAlt(sponsor.name),
            party: sponsor.party,
            initials: kyLegislatorAvatarInitials(sponsor),
            imgProps: { referrerPolicy: 'no-referrer' },
          }}
          chips={
            <MetaChip
              label={isPrimary ? 'Primary sponsor' : 'Co-sponsor'}
              size="small"
              tone="primary"
              variant="filled"
            />
          }
        />

        {sponsor.bio?.social?.email && (
          <Box sx={{ mt: 1.5, mb: 0.5 }}>
            <CopyableEmail email={sponsor.bio.social.email} />
          </Box>
        )}

        {(ballotpediaUrl || officialProfileHref) && (
          <Box sx={{ display: 'flex', gap: 0.25, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {ballotpediaUrl && <LegislatorExternalLinkButton href={ballotpediaUrl}>Ballotpedia</LegislatorExternalLinkButton>}
            {officialProfileHref && (
              <LegislatorExternalLinkButton href={officialProfileHref}>Official profile</LegislatorExternalLinkButton>
            )}
          </Box>
        )}
      </MuiCardContent>
    </MuiCard>
  );
}

/**
 * Compact list of official document versions from legiscan_texts. KY document dates
 * are "0000-00-00", so chronology comes from LegiScan's array order (oldest → newest)
 * and versions can't be interleaved into the dated HistoryTimeline. Deduped by stage
 * (newest document per stage wins). "Most current" follows the newest document
 * regardless of sort order; the default is newest-first because this list's job is
 * "get me the current text" (unlike the timeline, which tells the story oldest-first).
 */
function BillTextVersionsList({ texts }: { texts: LegiScanText[] }) {
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('newest');

  const { rows, mostCurrentDocId } = useMemo(() => {
    const newestFirst = texts
      .map((t, i) => ({ t, i }))
      .sort(
        (a, b) =>
          (textDateOrNull(b.t.date) ?? '').localeCompare(textDateOrNull(a.t.date) ?? '') ||
          b.i - a.i,
      )
      .map(({ t }) => t);
    const seen = new Set<string>();
    const deduped = newestFirst.filter((t) => {
      if (seen.has(t.type)) return false;
      seen.add(t.type);
      return true;
    });
    return {
      rows: sortOrder === 'newest' ? deduped : [...deduped].reverse(),
      mostCurrentDocId: deduped[0]?.doc_id,
    };
  }, [texts, sortOrder]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <ToggleButtonGroup
          size="small"
          value={sortOrder}
          exclusive
          onChange={(_, v: 'oldest' | 'newest' | null) => {
            if (v != null) setSortOrder(v);
          }}
          aria-label="Sort bill text versions"
        >
          <ToggleButton value="oldest" sx={{ textTransform: 'none', px: 1.5 }}>
            Oldest first
          </ToggleButton>
          <ToggleButton value="newest" sx={{ textTransform: 'none', px: 1.5 }}>
            Newest first
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {rows.map((t, i) => {
        const label = TEXT_TYPE_LABELS[t.type] ?? t.type;
        const date = textDateOrNull(t.date);
        const href = httpUrlForUiLink(t.state_link) || httpUrlForUiLink(t.url);
        const isCurrent = t.doc_id === mostCurrentDocId;
        return (
          <Box
            key={t.doc_id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.75,
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" fontWeight={isCurrent ? 600 : 400} sx={{ flex: 1, minWidth: 0 }}>
              {label}
              {date && (
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  {' · '}
                  {fmtDate(date, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Box>
              )}
            </Typography>
            {isCurrent && (
              <MuiChip label="Most current" size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            {href && (
              <MuiButton
                variant="text"
                size="small"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read the ${label} version`}
                endIcon={<OpenInNew sx={{ fontSize: '0.85rem !important' }} />}
                sx={{ fontWeight: 600, py: 0, minWidth: 0 }}
              >
                Read
              </MuiButton>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

type TimelineEntry = LegiScanHistory & {
  /** Roll calls attached to this action (rendered inline). */
  votes?: BillVoteRow[];
  /** True for rows synthesized from a vote with no matching history entry. */
  synthetic?: boolean;
};

function HistoryTimeline({
  history,
  votes = [],
  billNumber,
}: {
  history: LegiScanHistory[];
  votes?: BillVoteRow[];
  billNumber: string;
}) {
  const theme = useTheme();
  const { tooltipsEnabled } = useTooltips();
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [expanded, setExpanded] = useState(false);
  const collapseAt = 8;

  const merged = useMemo<TimelineEntry[]>(() => {
    const { attached, unmatched } = matchVotesToHistory(votes, history);
    const entries: TimelineEntry[] = history.map((h, i) =>
      attached.has(i) ? { ...h, votes: attached.get(i) } : h,
    );
    for (const v of unmatched) {
      entries.push({
        date: v.date ?? '',
        action: deriveRollCallLabel({ ...v, date: v.date ?? undefined }, history),
        chamber: rollCallChamberFromDesc(v.desc) ?? '',
        importance: 1,
        votes: [v],
        synthetic: true,
      });
    }
    return entries;
  }, [history, votes]);

  const sorted = useMemo(() => {
    const copy = [...merged].sort((a, b) => a.date.localeCompare(b.date));
    if (sortOrder === 'newest') copy.reverse();
    return copy;
  }, [merged, sortOrder]);

  /** Collapsed view keeps vote-bearing entries visible so roll calls never hide behind "Show all". */
  const visible =
    expanded || sorted.length <= collapseAt
      ? sorted
      : sorted.filter((e, i) => i < collapseAt || (e.votes?.length ?? 0) > 0);

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
      {visible.map((item, i) => {
        const isLast = i === visible.length - 1 && (expanded || sorted.length <= collapseAt);
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
            sx={{ display: 'flex', gap: 1.5, mb: isLast ? 0 : 2.5 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%', mt: 0.35,
                bgcolor: pinBg,
                border: `2px solid ${pinBorder}`,
                boxSizing: 'border-box',
              }} />
              {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: theme.palette.divider, mt: 0.35 }} />}
            </Box>
            <Box sx={{ pb: 0, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.125, lineHeight: 1.3 }}>
                {fmtDate(item.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {item.chamber === 'H' ? 'House' : item.chamber === 'S' ? 'Senate' : item.chamber}
                </Box>
              </Typography>
              <Typography
                component="div"
                variant="body2"
                color={isImportant ? 'text.primary' : 'text.secondary'}
                fontWeight={isImportant ? 500 : 400}
                sx={{ lineHeight: 1.35 }}
              >
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
              {item.votes?.map((v, vi) => (
                <InlineRollCall
                  key={v.roll_call_id ?? `vote-${vi}`}
                  vote={v}
                  billNumber={billNumber}
                  showOutcome={item.synthetic}
                />
              ))}
            </Box>
          </Box>
        );
      })}
      {sorted.length > collapseAt && (
        <MuiButton
          size="small"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          sx={{ mt: 2, textTransform: 'none', fontWeight: 600, pl: 0 }}
        >
          {expanded ? 'Show fewer' : `Show all ${sorted.length} actions`}
        </MuiButton>
      )}
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
  const billVotes = (detail?.votes ?? []) as BillVoteRow[];
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

  const effectiveDateNotice = getKyEnactedBillEffectiveDateNotice({ bill, effectiveStatus, history });

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
                  <ChamberChip
                    chamber={bill.chamber}
                    size="medium"
                    sx={{ fontSize: '0.9rem', '& .MuiChip-label': { px: 1.25 } }}
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
              {effectiveStatus && (
                <BillStatusMetaChip key="status" bill={bill} statusOverride={effectiveStatus} variant="detail" />
              )}
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
              <Box sx={{ mb: 2 }}>
                <ExpandableText
                  text={bill.description}
                  moreLabel="Show full description"
                  typographyProps={{ variant: 'body1', color: 'text.secondary', sx: { lineHeight: 1.75, fontSize: '1.05rem' } }}
                />
              </Box>
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

            {effectiveDateNotice && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                <Typography variant="body1" fontWeight={600} sx={{ fontSize: '1.02rem' }}>
                  {effectiveDateNotice.headline}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {effectiveDateNotice.detail}
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
                    Read the full text
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
                  <AiGeneratedBlock
                    officialHref={officialTextForAi}
                    officialLabel="Open official bill text (PDF)"
                    billNumber={bill.bill_number}
                    beta
                  >
                    {bill.ai_summary}
                  </AiGeneratedBlock>
                </MuiCardContent>
              </MuiCard>
            )}

            {/* Bill text versions — compact, deduped by stage, toggleable like the timeline */}
            {texts.length > 0 && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant={TYPE.cardTitle.variant} component="h2" fontWeight={TYPE.cardTitle.fontWeight}>
                      Bill Text Versions
                    </Typography>
                  </Box>
                  <BillTextVersionsList texts={texts} />
                </MuiCardContent>
              </MuiCard>
            )}

            {/* History — roll calls render inline on their matching action */}
            {(history.length > 0 || billVotes.length > 0) && (
              <MuiCard sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <MuiCardContent>
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant={TYPE.cardTitle.variant} component="h2" fontWeight={TYPE.cardTitle.fontWeight}>Legislative History</Typography>
                  </Box>
                  <HistoryTimeline history={history} votes={billVotes} billNumber={bill.bill_number} />
                </MuiCardContent>
              </MuiCard>
            )}
          </MuiGrid>

          {/* Right column — Sponsors */}
          <MuiGrid item xs={12} md={6}>
            {/* Sponsors */}
            {primarySponsors.length > 0 && (
              <MuiCard elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: 'none', border: 'none' }}>
                <MuiCardContent>
                  <Typography variant={TYPE.cardTitle.variant} component="h2" fontWeight={TYPE.cardTitle.fontWeight} gutterBottom>
                    {primarySponsors.length === 1 ? 'Primary Sponsor' : 'Primary Sponsors'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {primarySponsors.map((s) => (
                      <SponsorCard
                        key={s.people_id}
                        sponsor={s}
                        legislators={legislators}
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
                  <Typography variant={TYPE.cardTitle.variant} component="h2" fontWeight={TYPE.cardTitle.fontWeight} gutterBottom>
                    Co-sponsors ({coSponsors.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {coSponsors.map((s) => (
                      <SponsorCard
                        key={s.people_id}
                        sponsor={s}
                        legislators={legislators}
                        rosterPhoto={
                          matchLegislatorByLegiscanId(legislators, s.people_id)?.photo_url ??
                          matchLegislatorBySponsorName(legislators, s.name)?.photo_url
                        }
                      />
                    ))}
                  </Box>
                </MuiCardContent>
              </MuiCard>
            )}


          </MuiGrid>
        </MuiGrid>

        <BillHearingsSection billId={bill.id} />

        {/* General page feedback — the AI-summary block has its own summary-scoped link */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          Something wrong on this page?{' '}
          <MuiLink
            href={`mailto:katie@kyvky.com?subject=${encodeURIComponent(`Problem on ${bill.bill_number} page`)}`}
            underline="hover"
          >
            Tell us
          </MuiLink>
        </Typography>
      </MuiContainer>
    </Box>
  );
}
