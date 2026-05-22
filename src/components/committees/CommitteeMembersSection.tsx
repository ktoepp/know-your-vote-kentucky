'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { EmptyState } from '@/components/civic/EmptyState';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import {
  kyLegislatorAvatarInitials,
  kyLegislatorPortraitAlt,
  memberProfilePath,
  normalizeLegislatorPhotoUrl,
} from '@/lib/ky-member-utils';
import { legislatorRoleDistrictLine } from '@/lib/legislator-display';

export interface CommitteeMembersSectionProps {
  members: CommitteeMemberDisplay[];
  committeeProfileUrl: string | null;
}

function isChairRole(roleLabel: string | null) {
  return Boolean(roleLabel && roleLabel.toLowerCase().includes('chair'));
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''}`.toUpperCase() || '?';
}

export function CommitteeMembersSection({ members, committeeProfileUrl }: CommitteeMembersSectionProps) {
  const chairs = members.filter((member) => isChairRole(member.roleLabel));
  const otherMembers = members.filter((member) => !isChairRole(member.roleLabel));
  const groups = [
    { title: chairs.length === 1 ? 'Chair' : 'Co-chairs', rows: chairs },
    { title: 'Members', rows: otherMembers },
  ].filter((group) => group.rows.length > 0);

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.25 }}>
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        {members.length === 0 ? (
          <EmptyState
            message={
              committeeProfileUrl
                ? 'No members synced yet. Check the LRC committee profile or run a calendar sync after the next listed meeting.'
                : 'No members synced yet. Run a legislative calendar sync after this committee appears on the LRC calendar.'
            }
          />
        ) : (
          <Box sx={{ display: 'grid', gap: 2.25 }}>
            {groups.map((group, groupIndex) => (
              <Box key={group.title}>
                {groupIndex > 0 && <Divider sx={{ mb: 2.25 }} />}
                <Typography component={groupIndex === 0 ? 'h2' : 'h3'} variant="h4" fontWeight={600} color="text.primary" sx={{ mb: 1.5 }}>
                  {group.title}
                </Typography>
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {group.rows.map((member) => {
                    const leg = member.legislator;
                    const href = leg ? memberProfilePath(leg) : member.lrcProfileUrl;
                    const portraitSrc = leg
                      ? normalizeLegislatorPhotoUrl(leg.photo_url) || normalizeLegislatorPhotoUrl(leg.legiscan_image_url) || undefined
                      : undefined;
                    const initials = leg ? kyLegislatorAvatarInitials(leg) : initialsFromName(member.displayName);
                    const row = (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          borderRadius: 1,
                          p: 0.75,
                          mx: -0.75,
                          color: 'inherit',
                          textDecoration: 'none',
                          '&:hover': href ? { bgcolor: 'action.hover' } : undefined,
                        }}
                      >
                        <LegislatorAvatar
                          src={portraitSrc}
                          alt={leg ? kyLegislatorPortraitAlt(leg) : member.displayName}
                          initials={initials}
                          party={leg?.party}
                          showPartyBadge={Boolean(leg)}
                          imgProps={{ referrerPolicy: 'no-referrer' }}
                          sx={{ width: 52, height: 52, fontSize: '0.95rem' }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" color="text.primary" fontWeight={600} noWrap>
                            {member.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {member.roleLabel || (leg ? legislatorRoleDistrictLine(leg) : 'LRC legislator profile')}
                          </Typography>
                          {leg?.email && (
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {leg.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                    return href ? (
                      <Link
                        key={member.key}
                        href={href}
                        {...(!leg ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {row}
                      </Link>
                    ) : (
                      <Box key={member.key}>{row}</Box>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
