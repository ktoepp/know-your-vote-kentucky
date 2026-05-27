'use client';

import Link from 'next/link';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { EmptyState } from '@/components/civic/EmptyState';
import { LegislatorIdentityBlock } from '@/components/civic/LegislatorIdentityBlock';
import { MemberName } from '@/components/civic/MemberName';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { legislatorAvatarDescriptor, memberProfilePath } from '@/lib/ky-member-utils';
import { legislatorRoleDistrictLine } from '@/lib/legislator-display';
import { FOCUS_RING, INTERACTION } from '@/lib/ui-tokens';

export interface CommitteeMembersSectionProps {
  members: CommitteeMemberDisplay[];
  committeeProfileUrl: string | null;
}

function isChairRole(roleLabel: string | null) {
  return Boolean(roleLabel && roleLabel.toLowerCase().includes('chair'));
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
                    const external = !leg;
                    const identity = (
                      <LegislatorIdentityBlock
                        name={leg ? <MemberName member={leg} variant="primary" /> : member.displayName}
                        roleLine={
                          member.roleLabel || (leg ? legislatorRoleDistrictLine(leg) : 'LRC legislator profile')
                        }
                        density="compact"
                        gap={1.5}
                        avatar={legislatorAvatarDescriptor(leg, member.displayName)}
                        meta={
                          leg?.email ? (
                            // Copy button must stay interactive even though the whole row is a stretch link.
                            <Box onClick={(e) => e.stopPropagation()} sx={{ pointerEvents: 'auto' }}>
                              <CopyableEmail email={leg.email} variant="caption" display="block" />
                            </Box>
                          ) : undefined
                        }
                      />
                    );
                    return (
                      <Box
                        key={member.key}
                        sx={{
                          position: 'relative',
                          borderRadius: 1,
                          p: 0.75,
                          mx: -0.75,
                          ...(href && INTERACTION.rowHover),
                          '&:has(.committee-member-stretch-link:focus-visible)': FOCUS_RING,
                        }}
                      >
                        {href && (
                          <Link
                            href={href}
                            className="committee-member-stretch-link"
                            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            aria-label={`View profile for ${member.displayName}`}
                            style={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 1,
                              borderRadius: 8,
                              textDecoration: 'none',
                            }}
                          >
                            <span className="sr-only">View profile</span>
                          </Link>
                        )}
                        <Box sx={{ position: 'relative', zIndex: 2, pointerEvents: href ? 'none' : undefined }}>
                          {identity}
                        </Box>
                      </Box>
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
