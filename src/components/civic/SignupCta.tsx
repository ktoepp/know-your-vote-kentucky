'use client';

import NextLink from 'next/link';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useUser } from '@/app/lib/UserContext';
import { trackSignupCtaClicked } from '@/lib/analytics';

export interface SignupCtaProps {
  /** Where the prompt sits; carried on `signup_cta_clicked` for funnel reads. */
  surface: 'district_map_result' | 'member_profile';
  /**
   * Relative path to return to after signup / login (e.g. the lookup the visitor
   * just ran). Validated server-side by `safeAuthRedirectPath`.
   */
  next: string;
  /** Legislator context for the event, when the prompt is about one member. */
  memberId?: string | null;
  /** Heading; keep it about what the visitor was just doing. */
  title: string;
  /** One or two sentences, in the site voice: what an account actually does. */
  body: string;
  sx?: React.ComponentProps<typeof Paper>['sx'];
}

/**
 * Sign up / Log in prompt for signed-out visitors on content surfaces. Renders
 * nothing while auth state is loading or when the visitor is signed in, so it
 * never flashes for members. Copy follows docs/voice-and-tone.md: auth verbs are
 * "Sign up" / "Log in" and the CTA names the destination.
 */
export function SignupCta({ surface, next, memberId, title, body, sx }: SignupCtaProps) {
  const { user, loading } = useUser();
  if (loading || user) return null;

  const q = `?next=${encodeURIComponent(next)}`;
  return (
    <Paper
      elevation={0}
      component="aside"
      aria-labelledby={`signup-cta-${surface}`}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.light',
        bgcolor: '#EFF6FF',
        ...sx,
      }}
    >
      <Typography id={`signup-cta-${surface}`} variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 1.5 }}>
        {body}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          component={NextLink}
          href={`/auth/register${q}`}
          variant="contained"
          size="small"
          sx={{ minHeight: 44 }}
          onClick={() => trackSignupCtaClicked({ surface, authAction: 'register', memberId })}
        >
          Sign up
        </Button>
        <Button
          component={NextLink}
          href={`/auth/login${q}`}
          variant="text"
          size="small"
          sx={{ minHeight: 44 }}
          onClick={() => trackSignupCtaClicked({ surface, authAction: 'login', memberId })}
        >
          Log in
        </Button>
        <Box sx={{ flexBasis: '100%' }} />
        <Typography variant="caption" color="text.secondary">
          Free, non-partisan, and your data is never sold.
        </Typography>
      </Stack>
    </Paper>
  );
}
