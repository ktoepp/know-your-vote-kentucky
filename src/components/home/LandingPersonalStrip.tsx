'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { ArrowForward, Event, NotificationsActiveOutlined } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';
import type { ProfileActivityItem } from '@/app/api/me/activity/route';
import { BillNumber } from '@/components/bills/BillNumber';
import { formatKyMeetingDate } from '@/lib/ky-committee-display';
import { CARD, ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE } from '@/lib/ui-tokens';

/** Distinct followed bills to surface in the teaser. */
const STRIP_BILLS = 3;
/** Pull extra events so we can collapse multiple updates per bill down to one. */
const ACTIVITY_FETCH = 12;

/** Keep the most-recent event per bill; items arrive already sorted desc. */
function distinctByBill(items: ProfileActivityItem[], max: number): ProfileActivityItem[] {
  const seen = new Set<string>();
  const out: ProfileActivityItem[] = [];
  for (const item of items) {
    const key = item.bill_id ?? item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Signed-in only: a compact "what changed on the bills you follow" strip below
 * the returning hero. Surfaces existing followed-state inline (per the
 * 2026-05-10 no-dashboard boundary) — it is a launcher into `/feed`, not a
 * management surface. Renders nothing when signed out or when there is no
 * activity, so the onboarding cards below remain the empty state.
 */
export function LandingPersonalStrip() {
  const { user, session } = useUser();
  const token = session?.access_token ?? null;

  const [items, setItems] = useState<ProfileActivityItem[] | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/me/activity?limit=${ACTIVITY_FETCH}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = (await res.json().catch(() => ({}))) as { items?: ProfileActivityItem[] };
      setItems(distinctByBill(body.items ?? [], STRIP_BILLS));
    } catch {
      // Supplementary surface — fail silent and stay hidden.
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hidden until we have something worth showing.
  if (!user || !token || !items || items.length === 0) return null;

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 4 } }}>
      <Paper
        variant="outlined"
        sx={{ borderRadius: CARD.borderRadius, p: { xs: 2, sm: 2.5 } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <NotificationsActiveOutlined
              sx={{ color: 'primary.main', fontSize: ICON_REM.section }}
              aria-hidden
            />
            <Typography
              component="h2"
              variant={TYPE.sectionTitle.variant}
              fontWeight={TYPE.sectionTitle.fontWeight}
              sx={SECTION_TITLE_DISPLAY_SX}
            >
              Updates on bills you follow
            </Typography>
          </Box>
          <Button
            component={NextLink}
            href="/feed"
            size="small"
            endIcon={<ArrowForward sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none' }}
          >
            View your feed
          </Button>
        </Box>

        <List disablePadding>
          {items.map((item) => (
            <ListItem key={item.id} alignItems="flex-start" sx={{ px: 0, py: 0.75 }}>
              <ListItemText
                disableTypography
                primary={
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    <Chip
                      size="small"
                      icon={item.kind === 'hearing' ? <Event fontSize="small" /> : undefined}
                      label={item.kind === 'hearing' ? 'Hearing' : 'Bill update'}
                      color={item.kind === 'hearing' ? 'info' : 'default'}
                      variant="outlined"
                    />
                    {item.bill_number ? (
                      <BillNumber billNumber={item.bill_number} size="compact" href={item.href} />
                    ) : null}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {item.kind === 'hearing'
                        ? formatKyMeetingDate(item.occurred_at.slice(0, 10))
                        : formatOccurredAt(item.occurred_at)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {item.bill_title ? `${item.bill_title} — ` : ''}
                    {item.label}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}
