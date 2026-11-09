/**
 * Organization contact facts used in user-facing copy.
 * Every outbound email footer must carry the postal address (CAN-SPAM).
 */
export const KYVKY_POSTAL_ADDRESS = 'PO Box 133, Bardstown, Kentucky 40004';

/** Transactional From address (send-only, no inbox). `RESEND_FROM_EMAIL` overrides it at runtime. */
export const KYVKY_ALERTS_EMAIL = 'alerts@kyvky.org';

/** Human inbox: email Reply-To, contact links, vulnerability reports. Forwards to the original kyvky.com mailbox. */
export const KYVKY_CONTACT_EMAIL = 'katie@kyvky.org';
