'use client';

import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Bookmark as BookmarkFilled, CalendarMonth } from '@mui/icons-material';
import { Bookmark } from 'lucide-react';
import { CivicCard } from '@/components/ui/CivicCard';
import { MetaChip } from '@/components/ui/Chip';
import { CommitteeTagRow } from '@/components/committees/CommitteeTagRow';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import type { KYCommitteeBrowseCard } from '@/lib/ky-committees-browse-enriched';
import { iconRemSx } from '@/lib/ui-tokens';
import { formatKyMeetingDate, normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

export interface KYCommitteeCardProps {
  committee: KYCommitteeBrowseCard;
  following?: boolean;
  onToggleFollow?: (committeeId: string) => void;
}

/** Committee grid card — leadership line + topic chips when enriched browse data is available. */
export function KYCommitteeCard({ committee, following = false, onToggleFollow }: KYCommitteeCardProps) {
  const href = `/committees/${encodeURIComponent(committee.slug)}`;
  const displayName = normalizeKyGaDisplayName(committee.name);
  const leaders = committee.leadership.slice(0, 2);

  const followButton = onToggleFollow ? (
    <IconButton
      size="small"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFollow(committee.id);
      }}
      aria-pressed={following}
      aria-label={following ? 'Unfollow this committee' : 'Follow this committee'}
      sx={{
        color: following ? 'primary.main' : 'text.secondary',
        p: 0.25,
        mr: -0.25,
        mt: -0.25,
        flexShrink: 0,
        minWidth: { xs: 44, sm: 32 },
        minHeight: { xs: 44, sm: 32 },
      }}
    >
      {following ? (
        <BookmarkFilled sx={{ fontSize: '1.35rem' }} />
      ) : (
        <Bookmark size={22} strokeWidth={1.7} />
      )}
    </IconButton>
  ) : null;

  return (
    <CivicCard
      variant="meeting"
      href={href}
      ariaLabel={displayName}
      sx={{
        minHeight: 214,
        borderColor: 'divider',
        '& .MuiCardContent-root': {
          p: { xs: 2, sm: 2.25 },
          gap: 1.75,
        },
      }}
      header={
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <CommitteeTagRow committee={committee}>
            {committee.topicTags.map((tag) => (
              <MetaChip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </CommitteeTagRow>
          {followButton}
        </Box>
      }
      body={
        <>
          <Typography
            variant="h5"
            component="p"
            fontWeight={600}
            sx={{ fontSize: '1.08rem', lineHeight: 1.32, color: 'text.primary', mb: 1.25 }}
          >
            {displayName}
          </Typography>
          {leaders.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {leaders.map((leader) => (
                <Box
                  key={`${leader.name}-${leader.roleLabel}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <LegislatorAvatar
                    src={leader.portrait.src}
                    alt={leader.portrait.alt}
                    initials={leader.portrait.initials}
                    party={leader.portrait.party}
                    showPartyBadge={leader.portrait.showPartyBadge}
                    imgProps={leader.portrait.imgProps}
                    sx={{ width: 36, height: 36, fontSize: '0.72rem', fontWeight: 700 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                      {leader.roleLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                      {leader.name}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : null}
        </>
      }
      footer={
        committee.nextMeetingDate ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarMonth sx={{ ...iconRemSx('inline'), color: 'primary.main' }} aria-hidden />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Next meeting · {formatKyMeetingDate(committee.nextMeetingDate)}
              </Typography>
            </Box>
            {committee.nextMeetingAgendaPreview.length > 0 && (
              <Box
                component="ul"
                aria-label="Agenda preview"
                sx={{
                  listStyle: 'disc',
                  m: 0,
                  pl: 2.5,
                  display: 'grid',
                  gap: 0.25,
                  '& li::marker': { color: 'text.disabled', fontSize: '0.7em' },
                }}
              >
                {committee.nextMeetingAgendaPreview.map((line, i) => (
                  <Typography
                    key={i}
                    component="li"
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {line.raw}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No upcoming meetings scheduled.
          </Typography>
        )
      }
    />
  );
}
