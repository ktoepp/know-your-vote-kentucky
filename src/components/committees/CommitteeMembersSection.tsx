'use client';

import { Box, Grid, Typography } from '@mui/material';
import { Groups } from '@mui/icons-material';
import { EmptyState } from '@/components/civic/EmptyState';
import { MemberCompactCard } from '@/components/members/MemberCompactCard';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { memberProfilePath } from '@/lib/ky-member-utils';
import { ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE } from '@/lib/ui-tokens';

export interface CommitteeMembersSectionProps {
  members: CommitteeMemberDisplay[];
  committeeProfileUrl: string | null;
}

export function CommitteeMembersSection({ members, committeeProfileUrl }: CommitteeMembersSectionProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Groups sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
        <Typography
          component="h2"
          variant={TYPE.sectionTitle.variant}
          fontWeight={TYPE.sectionTitle.fontWeight}
          color="text.primary"
          sx={SECTION_TITLE_DISPLAY_SX}
        >
          Legislative members
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        From the LRC legislative calendar when meetings are listed, plus committee assignments synced from Open States.
      </Typography>

      {members.length === 0 ? (
        <EmptyState
          message={
            committeeProfileUrl
              ? 'No members synced yet. Check the LRC committee profile or run a calendar sync after the next listed meeting.'
              : 'No members synced yet. Run a legislative calendar sync after this committee appears on the LRC calendar.'
          }
        />
      ) : (
        <Grid container spacing={2}>
          {members.map((member) => {
            const leg = member.legislator;
            const href = leg ? memberProfilePath(leg) : member.lrcProfileUrl;
            return (
              <Grid item xs={12} sm={6} key={member.key}>
                <MemberCompactCard
                  leg={leg}
                  displayName={member.displayName}
                  profileHref={href}
                  external={!leg}
                  roleLabel={member.roleLabel}
                />
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
