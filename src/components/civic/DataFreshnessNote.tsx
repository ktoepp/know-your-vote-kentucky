'use client';

import React, { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYSource } from '@/types/kentucky';

interface DataFreshnessNoteProps {
  /** 'hero' = under hero on home; 'page' = under page titles */
  variant?: 'hero' | 'page';
}

/**
 * Shows the most recent `ky_sources` sync timestamp and a short AI / verification disclaimer.
 * Renders nothing if Supabase is missing, table is unreadable, or no timestamps exist.
 */
export default function DataFreshnessNote({ variant = 'page' }: DataFreshnessNoteProps) {
  const theme = useTheme();
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('ky_sources').select('last_sync_at').order('last_sync_at', { ascending: false });
      if (cancelled || error || !data?.length) return;

      const withDates = data.filter((s): s is Pick<KYSource, 'last_sync_at'> & { last_sync_at: string } => !!s.last_sync_at);
      if (!withDates.length) return;

      const maxTs = Math.max(...withDates.map((s) => new Date(s.last_sync_at).getTime()));
      const when = new Date(maxTs).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

      setLine(
        `Last updated ${when}. This site compiles and presents information with AI assistance—please verify important details with official sources.`,
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!line) return null;

  return (
    <Typography
      variant="caption"
      component="p"
      sx={{
        mt: variant === 'hero' ? 2 : 0,
        mb: variant === 'page' ? 2 : 0,
        maxWidth: 720,
        lineHeight: 1.5,
        color: variant === 'hero' ? alpha(theme.palette.common.white, 0.88) : 'text.secondary',
      }}
    >
      {line}
    </Typography>
  );
}
