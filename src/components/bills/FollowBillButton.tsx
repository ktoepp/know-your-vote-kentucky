'use client';

import { useEffect, useState } from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';
import { Bookmark, BookmarkBorder } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';
import {
  FOLLOW_BILL_BUTTON_SX,
  followBillAriaLabel,
  followBillButtonLabel,
  type FollowBillButtonState,
} from '@/lib/follow-labels';

type Props = {
  /** UUID or bill number (e.g. "HB1") — same shape the bill page receives. */
  billId: string;
};

type FetchState = 'idle' | 'loading' | 'saving' | 'error';

export function FollowBillButton({ billId }: Props) {
  const { user, session, loading: userLoading } = useUser();
  const [following, setFollowing] = useState(false);
  const [state, setState] = useState<FetchState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const token = session?.access_token ?? null;
  const authedReady = !userLoading && !!user && !!token;

  useEffect(() => {
    if (!authedReady) return;
    let cancelled = false;
    setState('loading');
    fetch(`/api/bills/${encodeURIComponent(billId)}/follow`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) throw new Error(body?.error || 'Failed to load follow state');
        setFollowing(!!body.following);
        setState('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrMsg(err.message);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [authedReady, billId, token]);

  const uiState: FollowBillButtonState = userLoading || state === 'loading'
    ? 'loading'
    : !user
      ? 'signed_out'
      : following
        ? 'following'
        : 'idle';

  if (!user) {
    const next = `/bills/${billId}`;
    return (
      <MuiButton
        component={NextLink}
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        variant="outlined"
        size="medium"
        startIcon={<BookmarkBorder />}
        sx={FOLLOW_BILL_BUTTON_SX}
      >
        {followBillButtonLabel('signed_out')}
      </MuiButton>
    );
  }

  const toggle = async () => {
    const prev = following;
    const next = !prev;
    setFollowing(next);
    setState('saving');
    setErrMsg(null);
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(billId)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Request failed');
      setState('idle');
    } catch (err: unknown) {
      setFollowing(prev);
      setErrMsg(err instanceof Error ? err.message : 'Request failed');
      setState('error');
    }
  };

  const busy = state === 'loading' || state === 'saving';

  return (
    <MuiButton
      onClick={toggle}
      disabled={busy || userLoading}
      size="medium"
      variant={following ? 'contained' : 'outlined'}
      startIcon={
        busy ? (
          <CircularProgress size={16} thickness={5} color="inherit" />
        ) : following ? (
          <Bookmark />
        ) : (
          <BookmarkBorder />
        )
      }
      aria-pressed={following}
      aria-label={followBillAriaLabel(uiState)}
      title={errMsg ?? undefined}
      sx={FOLLOW_BILL_BUTTON_SX}
    >
      {followBillButtonLabel(uiState)}
    </MuiButton>
  );
}
