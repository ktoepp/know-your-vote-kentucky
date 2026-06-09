'use client';

import { Box, Link as MuiLink, Typography } from '@mui/material';
import { EmptyState } from '@/components/civic/EmptyState';
import { MemberCompactCard } from '@/components/members/MemberCompactCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { memberProfilePath } from '@/lib/ky-member-utils';

export interface CommitteeMembersSectionProps {
  members: CommitteeMemberDisplay[];
  committeeProfileUrl: string | null;
}

function isChairRole(roleLabel: string | null) {
  return Boolean(roleLabel && roleLabel.toLowerCase().includes('chair'));
}

export function CommitteeMembersSection({ members, committeeProfileUrl }: CommitteeMembersSectionProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        message={
          committeeProfileUrl ? (
            <>
              Member roster not yet available.{' '}
              <MuiLink href={committeeProfileUrl} target="_blank" rel="noopener noreferrer">
                View the official LRC committee profile
              </MuiLink>{' '}
              for the current membership.
            </>
          ) : (
            'Member roster not yet available. Check back after this committee\'s next scheduled meeting.'
          )
        }
      />
    );
  }

  const chairs = members.filter((member) => isChairRole(member.roleLabel));
  const otherMembers = members.filter((member) => !isChairRole(member.roleLabel));
  const groups = [
    { title: chairs.length === 1 ? 'Chair' : 'Co-chairs', rows: chairs },
    { title: 'Members', rows: otherMembers },
  ].filter((group) => group.rows.length > 0);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {groups.map((group) => (
        <Box key={group.title}>
          <Typography component="h3" variant="subtitle1" fontWeight={700} color="text.primary" sx={{ mb: 1.5 }}>
            {group.title}
          </Typography>
          <CardGrid>
            {group.rows.map((member) => {
              const leg = member.legislator;
              const href = leg ? memberProfilePath(leg) : member.lrcProfileUrl;
              return (
                <CardGridItem key={member.key}>
                  <MemberCompactCard
                    leg={leg}
                    displayName={member.displayName}
                    profileHref={href}
                    external={!leg}
                    roleLabel={member.roleLabel}
                    profileNameHeading="h4"
                  />
                </CardGridItem>
              );
            })}
          </CardGrid>
        </Box>
      ))}
    </Box>
  );
}
