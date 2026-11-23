/**
 * Organization contact facts used in user-facing copy.
 * Every outbound email footer must carry the postal address (CAN-SPAM).
 *
 * The site and mail domain live here once so a future domain change is one edit.
 * Sending from `KYVKY_ALERTS_EMAIL` requires the domain to be verified in Resend
 * (and `auth@` in Supabase SMTP); `KYVKY_CONTACT_EMAIL` must be a real inbox.
 */
export const KYVKY_POSTAL_ADDRESS = 'PO Box 133, Bardstown, Kentucky 40004';

/** Bare domain used for the site and for mail. */
export const KYVKY_DOMAIN = 'kyvky.org';
/** Real inbox: Reply-To on every transactional send, and the contact for privacy, terms and vulnerability reports. */
export const KYVKY_CONTACT_EMAIL = `katie@${KYVKY_DOMAIN}`;
/** Transactional sender (no replies read here). `RESEND_FROM_EMAIL` overrides it per environment. */
export const KYVKY_ALERTS_EMAIL = `alerts@${KYVKY_DOMAIN}`;
