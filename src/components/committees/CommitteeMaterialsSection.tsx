'use client';

import React from 'react';
import { Box, Chip, Divider, Link as MuiLink, Typography } from '@mui/material';
import { Description, OpenInNew } from '@mui/icons-material';
import type { KYCommitteeMaterial } from '@/lib/ky-committee-data';
import { EmptyState } from '@/components/civic/EmptyState';
import { ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE } from '@/lib/ui-tokens';
import { formatKyMeetingDate } from '@/lib/ky-committee-display';

/** Group materials by meeting_date (or by date_label when meeting_date is missing). */
function groupByMeeting(materials: KYCommitteeMaterial[]) {
  const groups = new Map<
    string,
    { key: string; dateLabel: string; meetingDate: string | null; items: KYCommitteeMaterial[] }
  >();
  for (const m of materials) {
    const key = m.meeting_date ?? m.date_label ?? 'unknown';
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        dateLabel: m.date_label ?? (m.meeting_date ? formatKyMeetingDate(m.meeting_date) : 'Undated'),
        meetingDate: m.meeting_date,
        items: [],
      };
      groups.set(key, group);
    }
    group.items.push(m);
  }
  // Sort: most recent first (groups with no date go last)
  return [...groups.values()].sort((a, b) => {
    if (!a.meetingDate && !b.meetingDate) return 0;
    if (!a.meetingDate) return 1;
    if (!b.meetingDate) return -1;
    return b.meetingDate.localeCompare(a.meetingDate);
  });
}

export interface CommitteeMaterialsSectionProps {
  materials: KYCommitteeMaterial[];
  /** Profile / source URL on LRC for the "view all on LRC" fallback link. */
  committeeProfileUrl?: string | null;
}

export function CommitteeMaterialsSection({
  materials,
  committeeProfileUrl,
}: CommitteeMaterialsSectionProps) {
  const groups = groupByMeeting(materials);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Description sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
        <Typography
          component="h2"
          variant={TYPE.sectionTitle.variant}
          fontWeight={TYPE.sectionTitle.fontWeight}
          sx={SECTION_TITLE_DISPLAY_SX}
        >
          Meeting materials
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Documents posted by the Legislative Research Commission (LRC) for past committee meetings —
        agendas, minutes, presentations, and supporting exhibits. Files open on LRC.
      </Typography>

      {groups.length === 0 ? (
        <EmptyState
          message={
            <>
              No meeting materials posted yet.{' '}
              {committeeProfileUrl ? (
                <>
                  Check the committee&rsquo;s{' '}
                  <MuiLink href={committeeProfileUrl} target="_blank" rel="noopener noreferrer">
                    LRC profile
                  </MuiLink>{' '}
                  for the latest.
                </>
              ) : null}
            </>
          }
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {groups.map((group, i) => (
            <Box key={group.key}>
              {i > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {group.dateLabel}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', pl: 0, m: 0, display: 'grid', gap: 0.75 }}>
                {group.items.map((m) => (
                  <Box component="li" key={m.id} sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    {m.file_type && (
                      <Chip
                        size="small"
                        label={m.file_type.toUpperCase()}
                        variant="outlined"
                        sx={{ flexShrink: 0 }}
                      />
                    )}
                    <MuiLink
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                      sx={{
                        fontWeight: 500,
                        wordBreak: 'break-word',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      {m.title}
                      <OpenInNew sx={{ fontSize: '0.85rem', color: 'text.secondary' }} aria-hidden />
                    </MuiLink>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </>
  );
}
