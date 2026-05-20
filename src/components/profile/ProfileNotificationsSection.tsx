'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Link as MuiLink,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  Radio,
  RadioGroup,
  Snackbar,
  Typography,
} from '@mui/material';
import { Close as CloseIcon, NotificationsOutlined } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { useUser } from '@/app/lib/UserContext';
import { KY_TOPICS } from '@/lib/ky-topic-classifier';
import Link from 'next/link';
import {
  KY_DIGEST_EVENT_DESCRIPTIONS,
  KY_DIGEST_EVENT_GROUPS,
  KY_DIGEST_EVENT_LABELS,
  KY_DIGEST_EVENT_TYPES,
  KY_DIGEST_MAJOR_MILESTONE_SET,
  KY_DIGEST_MAJOR_MILESTONES,
  type DigestFrequency,
  type KyDigestEventType,
} from '@/lib/ky-notification-preferences';

type PrefsResponse = {
  digest_frequency: DigestFrequency;
  event_types: string[];
  topic_filters: string[];
  unsubscribed_all_at: string | null;
  updated_at: string;
};

const KY_TOPIC_ORDER = new Map<string, number>(KY_TOPICS.map((t, i) => [t, i]));

function sortSelectedTopics(selected: string[]): string[] {
  return [...selected].sort((a, b) => (KY_TOPIC_ORDER.get(a) ?? 999) - (KY_TOPIC_ORDER.get(b) ?? 999));
}

function SectionHeader() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }} aria-hidden>
        <NotificationsOutlined sx={{ fontSize: 28 }} />
      </Box>
      <Typography variant="h6" component="h2" fontWeight={700}>
        Notifications
      </Typography>
    </Box>
  );
}

export function ProfileNotificationsSection() {
  const { session } = useUser();
  const token = session?.access_token ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency>('daily');
  const [eventTypes, setEventTypes] = useState<KyDigestEventType[]>([]);
  const [topicFilters, setTopicFilters] = useState<string[]>([]);
  const [unsubscribedAt, setUnsubscribedAt] = useState<string | null>(null);

  const [saveBusy, setSaveBusy] = useState(false);
  const [topicBusy, setTopicBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevOff, setPrevOff] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as PrefsResponse & { error?: string };
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not load preferences');
      setDigestFrequency(body.digest_frequency);
      setEventTypes(body.event_types as KyDigestEventType[]);
      setTopicFilters(sortSelectedTopics(body.topic_filters ?? []));
      setUnsubscribedAt(body.unsubscribed_all_at ?? null);
      setPrevOff(body.digest_frequency === 'off');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load preferences');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchPrefs = async (partial: Record<string, unknown>) => {
    if (!token) throw new Error('Not signed in');
    const res = await fetch('/api/me/preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const body = (await res.json().catch(() => ({}))) as PrefsResponse & { error?: string };
    if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Update failed');
    return body as PrefsResponse;
  };

  const handleSaveDigestAndEvents = async () => {
    if (!token) return;
    setSaveBusy(true);
    setError(null);
    try {
      const data = await patchPrefs({
        digest_frequency: digestFrequency,
        event_types: eventTypes,
      });
      setUnsubscribedAt(data.unsubscribed_all_at ?? null);
      if (digestFrequency === 'off' && !prevOff) {
        setToast("You won't receive email digests until you turn this back on. Your follows are saved.");
      } else {
        setToast('Notification preferences saved.');
      }
      setPrevOff(digestFrequency === 'off');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveBusy(false);
    }
  };

  const patchTopicFilters = async (next: string[]) => {
    if (!token) return;
    setTopicBusy(true);
    setError(null);
    try {
      const data = await patchPrefs({ topic_filters: next });
      setTopicFilters(sortSelectedTopics(data.topic_filters ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update topics');
    } finally {
      setTopicBusy(false);
    }
  };

  const toggleTopic = (label: string, checked: boolean) => {
    const set = new Set(topicFilters);
    if (checked) set.add(label);
    else set.delete(label);
    void patchTopicFilters(sortSelectedTopics([...set]));
  };

  const removeTopic = (label: string) => {
    void patchTopicFilters(topicFilters.filter((t) => t !== label));
  };

  const toggleEvent = (slug: KyDigestEventType, checked: boolean) => {
    setEventTypes((prev) => {
      const set = new Set(prev);
      if (checked) set.add(slug);
      else set.delete(slug);
      return KY_DIGEST_EVENT_TYPES.filter((t) => set.has(t));
    });
  };

  const applyPresetMilestones = () => {
    setEventTypes([...KY_DIGEST_MAJOR_MILESTONES]);
  };

  const applyPresetEverything = () => {
    setEventTypes([...KY_DIGEST_EVENT_TYPES]);
  };

  if (!token) return null;

  if (loading) {
    return (
      <>
        <SectionHeader />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} aria-label="Loading notification settings" />
        </Box>
      </>
    );
  }

  return (
    <>
      <SectionHeader />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {unsubscribedAt && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You unsubscribed from digest emails using a link in a message. Choose <strong>Daily</strong> or{' '}
          <strong>Weekly</strong> below and save to start receiving digests again.
        </Alert>
      )}

      <FormControl component="fieldset" variant="standard" sx={{ mb: 2, width: '100%' }}>
        <FormLabel component="legend">Digest frequency</FormLabel>
        <RadioGroup
          value={digestFrequency}
          onChange={(e) => setDigestFrequency(e.target.value as DigestFrequency)}
          sx={{ mt: 0.5 }}
        >
          <FormControlLabel value="daily" control={<Radio />} label="Daily (around 7:00 AM Eastern)" />
          <FormControlLabel value="weekly" control={<Radio />} label="Weekly (Mondays, same time)" />
          <FormControlLabel value="off" control={<Radio />} label="Off (keep my follows, no emails)" />
        </RadioGroup>
      </FormControl>

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Email about these event types
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Aligned with Kentucky{' '}
        <MuiLink component={Link} href="/legislature/resources" underline="hover" fontWeight={600}>
          Bill Watch
        </MuiLink>{' '}
        alert types — without a separate state login. Hearings use our LRC calendar sync; enable{' '}
        <strong>Agenda / hearing scheduled</strong> for committee agenda lines.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Button size="small" variant="outlined" onClick={applyPresetMilestones}>
          Major milestones only
        </Button>
        <Button size="small" variant="outlined" onClick={applyPresetEverything}>
          Everything
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Types marked with * are included in the &quot;Major milestones only&quot; preset.
      </Typography>
      {KY_DIGEST_EVENT_GROUPS.map((group) => (
        <Box key={group.id} sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.25 }}>
            {group.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {group.description}
          </Typography>
          <FormGroup>
            {group.types.map((slug) => {
              const checked = eventTypes.includes(slug);
              const star = KY_DIGEST_MAJOR_MILESTONE_SET.has(slug);
              return (
                <FormControlLabel
                  key={slug}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={(e) => toggleEvent(slug, e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Box>
                      <Typography component="span" variant="body2" display="block">
                        {star ? '* ' : ''}
                        {KY_DIGEST_EVENT_LABELS[slug]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {KY_DIGEST_EVENT_DESCRIPTIONS[slug]}
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mb: 0.5 }}
                />
              );
            })}
          </FormGroup>
        </Box>
      ))}

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Topic alerts
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Get digest items when bills tagged with these topics change. Individual bill follows are the most reliable
        way to track a specific bill; topic tags are automated and can miss or mislabel some bills.
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
          gap: 0,
          mb: 2,
          opacity: topicBusy ? 0.7 : 1,
          pointerEvents: topicBusy ? 'none' : 'auto',
        }}
      >
        {KY_TOPICS.map((label) => (
          <FormControlLabel
            key={label}
            control={
              <Checkbox
                checked={topicFilters.includes(label)}
                onChange={(e) => toggleTopic(label, e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" component="span">
                {label}
              </Typography>
            }
          />
        ))}
      </Box>

      {topicFilters.length > 0 && (
        <>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
            Topics you follow
          </Typography>
          <List dense disablePadding sx={{ mb: 2 }}>
            {topicFilters.map((t) => (
              <ListItem
                key={t}
                secondaryAction={
                  <IconButton edge="end" aria-label={`Stop following topic ${t}`} onClick={() => removeTopic(t)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText primary={t} />
              </ListItem>
            ))}
          </List>
        </>
      )}

      <Button variant="contained" disabled={saveBusy} onClick={() => void handleSaveDigestAndEvents()}>
        {saveBusy ? 'Saving…' : 'Save digest frequency and event types'}
      </Button>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
