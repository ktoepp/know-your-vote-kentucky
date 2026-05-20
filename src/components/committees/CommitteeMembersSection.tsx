'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Groups } from '@mui/icons-material';
import { EmptyState } from '@/components/civic/EmptyState';
import { MemberCard } from '@/components/members/MemberCard';
import { MetaChip } from '@/components/ui/Chip';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { memberProfilePath } from '@/lib/ky-member-utils';
import type { KYLegislator } from '@/types/kentucky';
import { ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE } from '@/lib/ui-tokens';

export interface CommitteeMembersSectionProps {
  members: CommitteeMemberDisplay[];
  legislatorRoster: KYLegislator[];
  committeeProfileUrl: string | null;
  /** Grid of member cards (browse-style) or compact list with chamber + role (detail page). */
  layout?: 'grid' | 'list';
}

function chamberAbbrev(leg: KYLegislator | null): string {
  if (leg?.chamber === 'house') return '(H)';
  if (leg?.chamber === 'senate') return '(S)';
  return '';
}

function UnlinkedMemberCard({ member }: { member: CommitteeMemberDisplay }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent>
        {member.roleLabel && (
          <MetaChip label={member.roleLabel} size="small" tone="primary" variant="outlined" sx={{ mb: 1 }} />
        )}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {member.displayName}
        </Typography>
        {member.lrcProfileUrl && (
          <Typography variant="body2">
            <Link href={member.lrcProfileUrl} target="_blank" rel="noopener noreferrer">
              LRC legislator profile
            </Link>
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function CommitteeMembersSection({
  members,
  legislatorRoster,
  committeeProfileUrl,
  layout = 'grid',
}: CommitteeMembersSectionProps) {
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
      ) : layout === 'list' ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <List disablePadding>
            {members.map((member, i) => {
              const abbrev = chamberAbbrev(member.legislator);
              const href = member.legislator ? memberProfilePath(member.legislator) : member.lrcProfileUrl;
              return (
                <ListItem key={member.key} divider={i < members.length - 1} sx={{ py: 1.25, px: 2 }}>
                  <ListItemText
                    primary={
                      href ? (
                        <Link
                          href={href}
                          target={member.legislator ? undefined : '_blank'}
                          rel={member.legislator ? undefined : 'noopener noreferrer'}
                          style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
                        >
                          {member.displayName}
                          {abbrev ? ` ${abbrev}` : ''}
                        </Link>
                      ) : (
                        <Typography component="span" fontWeight={600}>
                          {member.displayName}
                          {abbrev ? ` ${abbrev}` : ''}
                        </Typography>
                      )
                    }
                    secondary={member.roleLabel ?? undefined}
                  />
                </ListItem>
              );
            })}
          </List>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid item xs={12} sm={6} key={member.key}>
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {member.roleLabel && (
                  <MetaChip
                    label={member.roleLabel}
                    size="small"
                    tone="primary"
                    variant="outlined"
                    sx={{ mb: 1, alignSelf: 'flex-start' }}
                  />
                )}
                {member.legislator ? (
                  <MemberCard
                    leg={member.legislator}
                    legislatorRoster={legislatorRoster}
                    profileHref={memberProfilePath(member.legislator)}
                    showDistrictInSubtitle
                  />
                ) : (
                  <UnlinkedMemberCard member={member} />
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
