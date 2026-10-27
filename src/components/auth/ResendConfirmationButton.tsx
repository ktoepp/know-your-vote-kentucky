'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { supabase } from '@/app/lib/supabaseClient';

export const RESEND_COOLDOWN_SECONDS = 60;

export interface ResendConfirmationButtonProps {
  /** Address the signup confirmation link goes to. */
  email: string;
  /** Where the link lands, usually `verifyRedirectUrl(...)` from `@/lib/auth/signup-result`. */
  emailRedirectTo: string;
  /** Start disabled, for example right after signup already sent a link. */
  startCoolingDown?: boolean;
}

/**
 * Sends the signup confirmation link again. Disables itself for
 * {@link RESEND_COOLDOWN_SECONDS} seconds after each use.
 */
export function ResendConfirmationButton({
  email,
  emailRedirectTo,
  startCoolingDown = false,
}: ResendConfirmationButtonProps) {
  const [cooldownUntil, setCooldownUntil] = useState<number>(() =>
    startCoolingDown ? Date.now() + RESEND_COOLDOWN_SECONDS * 1000 : 0,
  );
  const [now, setNow] = useState<number>(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const handleResend = async () => {
    if (!supabase || !email) {
      setMessage({ tone: 'error', text: 'Authentication service is not configured.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    });
    setBusy(false);
    const t = Date.now();
    setNow(t);
    setCooldownUntil(t + RESEND_COOLDOWN_SECONDS * 1000);
    setMessage(
      error
        ? { tone: 'error', text: 'We could not send the link. Wait a minute and try again.' }
        : { tone: 'ok', text: `We sent a new link to ${email}.` },
    );
  };

  return (
    <Box>
      <Button
        variant="outlined"
        fullWidth
        onClick={() => void handleResend()}
        disabled={busy || secondsLeft > 0}
      >
        {busy ? 'Sending…' : 'Send the link again'}
      </Button>
      <Box aria-live="polite">
        {message && (
          <Typography
            variant="body2"
            color={message.tone === 'error' ? 'error' : 'text.secondary'}
            align="center"
            sx={{ mt: 1 }}
          >
            {message.text}
          </Typography>
        )}
      </Box>
      {secondsLeft > 0 && (
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 0.5 }}>
          You can send another link in {secondsLeft} seconds.
        </Typography>
      )}
    </Box>
  );
}
