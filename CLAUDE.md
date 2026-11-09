# Know Your Vote Kentucky — project notes

## Organization facts

- Mailing address: **PO Box 133, Bardstown, Kentucky 40004** (canonical constant: `KYVKY_POSTAL_ADDRESS` in `src/lib/kyvky-contact.ts`). Every outbound email footer must include it (CAN-SPAM).
- Canonical site: `https://www.kyvky.org` (moved from `kyvky.com`; plan in `docs/specs/org-domain-migration.md`).
- Email sender: `alerts@kyvky.org`; reply-to: `katie@kyvky.org` (constants `KYVKY_ALERTS_EMAIL` / `KYVKY_CONTACT_EMAIL` in `src/lib/kyvky-contact.ts`; the `.org` address forwards to the original `katie@kyvky.com` inbox).

## Copy conventions

- All user-facing copy follows `docs/voice-and-tone.md` — neutral, non-partisan, honest sourcing. Email digest copy specifics are in its §2 "Bill digest email".
