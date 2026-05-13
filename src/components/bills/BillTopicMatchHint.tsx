'use client';

/**
 * Hint shown on a bill detail page when the bill isn't individually followed
 * but matches one or more of the user's notification topic filters. Tells the
 * user that updates on this bill are already included in their digest, and
 * surfaces the matching topic name so they can correlate with their preferences.
 *
 * Hidden when:
 *  - user is not signed in / not loaded
 *  - the user is individually following this bill (the Follow button covers it)
 *  - digest_frequency is 'off' or the user is unsubscribed
 *  - no topic_filters intersect bill.topics
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { NotificationsActive } from '@mui/icons-material';
import { useUser } from '@/app/lib/UserContext';
import { topicsForLegiScanSubjects } from '@/lib/ky-topic-legiscan-mapping';

type Props = {
  billId: string;
  topics: string[] | null;
  legiScanSubjects?: Array<{ subject_id?: number; subject_name?: string }> | null;
};

type PreferencesResponse = {
  digest_frequency?: 'daily' | 'weekly' | 'off';
  topic_filters?: string[] | null;
  unsubscribed_all_at?: string | null;
};

type FollowStateResponse = {
  following?: boolean;
};

function intersect(a: string[] | null | undefined, b: string[] | null | undefined): string[] {
  if (!a?.length || !b?.length) return [];
  const set = new Set(a);
  return b.filter((t) => set.has(t));
}

export function BillTopicMatchHint({ billId, topics, legiScanSubjects }: Props) {
  const { user, session, loading: userLoading } = useUser();
  const token = session?.access_token ?? null;
  const billTopics = useMemo(() => {
    const own = topics ?? [];
    const fromSubjects = topicsForLegiScanSubjects(legiScanSubjects ?? []);
    return Array.from(new Set([...own, ...fromSubjects]));
  }, [topics, legiScanSubjects]);

  const [prefs, setPrefs] = useState<PreferencesResponse | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    if (userLoading || !user || !token || billTopics.length === 0) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/me/preferences', { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/bills/${encodeURIComponent(billId)}/follow`, { headers }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([p, f]: [PreferencesResponse | null, FollowStateResponse | null]) => {
        if (cancelled) return;
        setPrefs(p);
        setFollowing(f?.following ?? false);
      })
      .catch(() => {
        // best-effort; silent on failure
      });
    return () => {
      cancelled = true;
    };
  }, [billId, billTopics.length, token, user, userLoading]);

  const matches = useMemo(
    () => intersect(billTopics, prefs?.topic_filters ?? []),
    [billTopics, prefs?.topic_filters],
  );

  const digestActive = prefs && prefs.digest_frequency !== 'off' && !prefs.unsubscribed_all_at;
  const shouldRender =
    !userLoading &&
    !!user &&
    following === false &&
    digestActive === true &&
    matches.length > 0;

  if (!shouldRender) return null;

  const topicList = matches.length === 1 ? matches[0] : `${matches.slice(0, -1).join(', ')} and ${matches.at(-1)}`;
  const noun = matches.length === 1 ? 'topic' : 'topics';

  return (
    <Box sx={{ mb: 2 }}>
      <Alert
        icon={<NotificationsActive fontSize="inherit" />}
        severity="info"
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        You follow the <strong>{topicList}</strong> {noun} — updates on this bill are included in
        your digest email.
      </Alert>
    </Box>
  );
}
