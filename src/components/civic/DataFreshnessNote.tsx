'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import WarningAmber from '@mui/icons-material/WarningAmber';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYSource } from '@/types/kentucky';

interface DataFreshnessNoteProps {
  /** 'hero' = under hero on home; 'page' = under page titles */
  variant?: 'hero' | 'page';
  /** Optional `ky_sources.source_name` filter (e.g., 'bills', 'legislators', 'ordinances'). */
  source?: string;
}

const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Shows the most recent `ky_sources` sync timestamp and a short AI / verification disclaimer.
 * When `source` is set, scopes the query to that single `source_name`.
 * Renders nothing if Supabase is missing, table is unreadable, or no timestamps exist.
 */
export default function DataFreshnessNote({ variant = 'page', source }: DataFreshnessNoteProps) {
  const theme = useTheme();
  const [lastUpdatedWhen, setLastUpdatedWhen] = useState<string | null>(null);
  const [staleHours, setStaleHours] = useState<number | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      let query = supabase.from('ky_sources').select('last_sync_at').order('last_sync_at', { ascending: false });
      if (source) query = query.eq('source_name', source);
      const { data, error } = await query;
      if (cancelled || error || !data?.length) return;

      const withDates = data.filter((s): s is Pick<KYSource, 'last_sync_at'> & { last_sync_at: string } => !!s.last_sync_at);
      if (!withDates.length) return;

      const maxTs = Math.max(...withDates.map((s) => new Date(s.last_sync_at).getTime()));
      const when = new Date(maxTs).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
      const ageMs = Date.now() - maxTs;

      if (cancelled) return;
      setStaleHours(ageMs > STALE_THRESHOLD_MS ? Math.round(ageMs / (60 * 60 * 1000)) : null);
      setLastUpdatedWhen(when);
    })();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (!lastUpdatedWhen) return null;

  const textColor = variant === 'hero' ? alpha(theme.palette.common.white, 0.88) : 'text.secondary';
  const iconColor = variant === 'hero' ? alpha(theme.palette.common.white, 0.7) : alpha(theme.palette.warning.main, 0.75);

  return (
    <Box
      sx={{
        mt: variant === 'hero' ? 2 : 0,
        mb: variant === 'page' ? 2 : 0,
        maxWidth: 720,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.75,
      }}
    >
      {staleHours !== null && (
        <WarningAmber
          fontSize="small"
          aria-label={`${source ? `${source} data` : 'Data'} may be out of date; last synced ${staleHours} hours ago`}
          sx={{ color: iconColor, mt: '1px' }}
        />
      )}
      <Typography variant="caption" component="p" sx={{ lineHeight: 1.5, color: textColor }}>
        Last updated {lastUpdatedWhen}.
        <br />
        This site compiles and presents information with AI assistance. Please verify important details with official
        sources.
      </Typography>
    </Box>
  );
}
