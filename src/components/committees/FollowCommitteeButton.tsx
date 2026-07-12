'use client';

import { useEffect, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Bookmark, BookmarkBorder } from '@mui/icons-material';
import NextLink from 'next/link';
import { useUser } from '@/app/lib/UserContext';
import { trackCommitteeFollowed, trackCommitteeUnfollowed } from '@/lib/analytics';

type Props = {
  /** Committee UUID or slug. */
  committeeId: string;
  size?: 'small' | 'medium';
};

type FetchState = 'idle' | 'loading' | 'saving' | 'error';

export function FollowCommitteeButton({ committeeId, size = 'small' }: Props) {
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
    fetch(`/api/committees/${encodeURIComponent(committeeId)}/follow`, {
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
  }, [authedReady, committeeId, token]);

  if (userLoading) {
    return (
      <Button
        variant="outlined"
        size={size}
        disabled
        startIcon={<CircularProgress size={14} thickness={5} />}
        sx={{ borderRadius: 999, px: 1.5 }}
        aria-busy="true"
        aria-label="Loading account"
      >
        Follow
      </Button>
    );
  }

  if (!user) {
    const next = `/committees/${committeeId}`;
    return (
      <Button
        component={NextLink}
        href={`/auth/login?next=${encodeURIComponent(next)}`}
        variant="outlined"
        size={size}
        startIcon={<BookmarkBorder fontSize="small" aria-hidden />}
        sx={{ borderRadius: 999, px: 1.5 }}
      >
        Log in to follow
      </Button>
    );
  }

  const toggle = async () => {
    const prev = following;
    const next = !prev;
    setFollowing(next);
    setState('saving');
    setErrMsg(null);
    try {
      const res = await fetch(`/api/committees/${encodeURIComponent(committeeId)}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || 'Request failed');
      setState('idle');
      if (next) trackCommitteeFollowed(committeeId);
      else trackCommitteeUnfollowed(committeeId);
    } catch (err: unknown) {
      setFollowing(prev);
      setErrMsg(err instanceof Error ? err.message : 'Request failed');
      setState('error');
    }
  };

  const busy = state === 'loading' || state === 'saving';

  return (
    <Button
      onClick={() => void toggle()}
      disabled={busy}
      variant={following ? 'contained' : 'outlined'}
      size={size}
      startIcon={
        busy ? (
          <CircularProgress size={14} thickness={5} color="inherit" />
        ) : following ? (
          <Bookmark fontSize="small" aria-hidden />
        ) : (
          <BookmarkBorder fontSize="small" aria-hidden />
        )
      }
      aria-pressed={following}
      aria-label={following ? 'Unfollow this committee' : 'Follow this committee'}
      title={errMsg ?? undefined}
      sx={{ borderRadius: 999, px: 1.5 }}
    >
      {following ? 'Following' : 'Follow'}
    </Button>
  );
}
