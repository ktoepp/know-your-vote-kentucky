/**
 * Pure mapping from Resend webhook events to `ky_notifications_log` and
 * `ky_notification_preferences` updates. Used by `/api/webhooks/resend`.
 *
 * Log status precedence: sent < failed < bounced < complained. A webhook only
 * moves a row up this order, never down (see `allowedPredecessors`).
 */

export type ResendBounceType = 'hard' | 'soft' | string;

export type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    bounce?: { type?: ResendBounceType; message?: string };
    [k: string]: unknown;
  };
};

export type NotificationLogStatus = 'sent' | 'failed' | 'bounced' | 'complained';

/** Lowest to highest severity. */
export const NOTIFICATION_LOG_STATUS_ORDER: readonly NotificationLogStatus[] = [
  'sent',
  'failed',
  'bounced',
  'complained',
];

export type ClassifiedResendEvent = {
  /** New log status, or null when the event must not write to the log. */
  logStatus: NotificationLogStatus | null;
  bounceState: 'soft' | 'hard' | 'complained' | null;
  suppress: boolean;
  reason: string | null;
};

export function classifyEvent(event: ResendWebhookEvent): ClassifiedResendEvent {
  switch (event.type) {
    // Delivered: the row was written as 'sent' at send time, so nothing to change.
    case 'email.delivered':
      return { logStatus: null, bounceState: null, suppress: false, reason: null };
    case 'email.bounced': {
      const t = event.data?.bounce?.type;
      const hard = t === 'hard' || t === 'Permanent' || t === 'permanent';
      return {
        logStatus: 'bounced',
        bounceState: hard ? 'hard' : 'soft',
        suppress: hard,
        reason: hard ? 'hard_bounce' : null,
      };
    }
    case 'email.complained':
      return {
        logStatus: 'complained',
        bounceState: 'complained',
        suppress: true,
        reason: 'spam_complaint',
      };
    // Delayed: no write, so the row stays 'sent' and the digest window advances.
    case 'email.delivery_delayed':
      return { logStatus: null, bounceState: null, suppress: false, reason: null };
    default:
      return { logStatus: null, bounceState: null, suppress: false, reason: null };
  }
}

/**
 * Statuses a row may hold for an update to `next` to apply: every status
 * strictly below `next` in the precedence order. Used as a database-side
 * condition so concurrent or late events can never downgrade a row.
 */
export function allowedPredecessors(next: NotificationLogStatus): NotificationLogStatus[] {
  const idx = NOTIFICATION_LOG_STATUS_ORDER.indexOf(next);
  if (idx <= 0) return [];
  return NOTIFICATION_LOG_STATUS_ORDER.slice(0, idx);
}
