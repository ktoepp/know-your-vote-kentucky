import type { SxProps, Theme } from '@mui/material';

/** Shared follow-bill UI copy — see docs/specs/follow-bills.md */
export const FOLLOW_COPY = {
  follow: 'Follow',
  following: 'Following',
  followed: 'Followed',
  signInToFollow: 'Log in to follow',
  unfollow: 'Unfollow',
  followedBillsSection: 'Followed bills',
  followAnotherBill: 'Follow another bill',
  followingFilter: 'Following',
  signInForFollowingFilter: 'Log in to use the Following filter.',
} as const;

export type FollowBillButtonState = 'loading' | 'signed_out' | 'idle' | 'following';

export function followBillButtonLabel(state: FollowBillButtonState): string {
  if (state === 'following') return FOLLOW_COPY.following;
  if (state === 'signed_out') return FOLLOW_COPY.signInToFollow;
  return FOLLOW_COPY.follow;
}

export function followBillAriaLabel(state: FollowBillButtonState): string {
  if (state === 'following') return 'Unfollow this bill';
  if (state === 'signed_out') return 'Log in to follow this bill';
  return 'Follow this bill';
}

/** Consistent touch target + typography for FollowBillButton on bill detail. */
export const FOLLOW_BILL_BUTTON_SX: SxProps<Theme> = {
  fontSize: '1rem',
  py: 1,
  px: 2,
  minHeight: 44,
  flexShrink: 0,
  textTransform: 'none',
};
