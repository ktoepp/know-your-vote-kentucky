/**
 * Pure helpers for the one-click unsubscribe route (`/api/unsubscribe/[token]`).
 *
 * Two lists share one token:
 * - `all`: every email kind (bill digest and the weekly My Legislators email).
 * - `my_legislators`: only the weekly My Legislators email.
 *
 * A missing or unknown `list` value means `all`, the stronger opt-out.
 */

export type UnsubscribeList = 'all' | 'my_legislators';

export type UnsubscribeUpdate =
  | {
      digest_frequency: 'off';
      unsubscribed_all_at: string;
      digest_user_disabled: true;
      my_legislators_weekly: false;
    }
  | { my_legislators_weekly: false };

/** Reads the `list` query value. Anything other than `my_legislators` is `all`. */
export function parseUnsubscribeList(raw: string | null | undefined): UnsubscribeList {
  return raw === 'my_legislators' ? 'my_legislators' : 'all';
}

/** The `ky_notification_preferences` update for an unsubscribe from `list`. */
export function buildUnsubscribeUpdate(list: UnsubscribeList, nowIso: string): UnsubscribeUpdate {
  if (list === 'my_legislators') {
    // Only the weekly email. The digest fields stay untouched so this does not
    // opt the subscriber out of (or back into) bill digests.
    return { my_legislators_weekly: false };
  }
  return {
    digest_frequency: 'off',
    unsubscribed_all_at: nowIso,
    digest_user_disabled: true,
    my_legislators_weekly: false,
  };
}

/** Success page copy (voice guide §3 "Unsubscribe page"). */
export function unsubscribeSuccessCopy(list: UnsubscribeList): { title: string; body: string } {
  if (list === 'my_legislators') {
    return {
      title: 'Weekly legislator email stopped',
      body: 'You will not get the weekly email about your legislators. Bill digest emails are not affected. You can turn the weekly email back on from your profile.',
    };
  }
  return {
    title: 'Email updates stopped',
    body: 'You will not receive further digest or weekly legislator emails from Know Your Vote Kentucky. You can turn them back on at any time from your profile.',
  };
}
