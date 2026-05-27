'use client';

import { Box, Typography } from '@mui/material';
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
          committeeProfileUrl
            ? 'No members synced yet. Check the LRC committee profile or run a calendar sync after the next listed meeting.'
            : 'No members synced yet. Run a legislative calendar sync after this committee appears on the LRC calendar.'
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
