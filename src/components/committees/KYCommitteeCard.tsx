'use client';

import React from 'react';
import { Avatar, Box, IconButton, Typography } from '@mui/material';
import { Bookmark as BookmarkFilled, CalendarMonth } from '@mui/icons-material';
import { Bookmark } from 'lucide-react';
import { CivicCard } from '@/components/ui/CivicCard';
import { MetaChip } from '@/components/ui/Chip';
import { CommitteeTagRow } from '@/components/committees/CommitteeTagRow';
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
  const leaders = committee.leadershipNames.slice(0, 2).map((entry) => {
    const match = entry.match(/^(.+?)\s+\(([^)]+)\)$/);
    const name = normalizeKyGaDisplayName(match?.[1] ?? entry);
    const role = match?.[2] ?? 'Committee leader';
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
    return { name, role, initials };
  });

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
                <Box key={`${leader.name}-${leader.role}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    {leader.initials || '?'}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.2 }}>
                      {leader.role}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarMonth sx={{ ...iconRemSx('inline'), color: 'primary.main' }} aria-hidden />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Next meeting · {formatKyMeetingDate(committee.nextMeetingDate)}
            </Typography>
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
