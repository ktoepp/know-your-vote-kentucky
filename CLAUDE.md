# Know Your Vote Kentucky — project notes

## Organization facts

- Mailing address: **PO Box 133, Bardstown, Kentucky 40004** (canonical constant: `KYVKY_POSTAL_ADDRESS` in `src/lib/kyvky-contact.ts`). Every outbound email footer must include it (CAN-SPAM).
- Email sender: `alerts@kyvky.org`; reply-to: `katie@kyvky.org` (canonical constants `KYVKY_ALERTS_EMAIL` / `KYVKY_CONTACT_EMAIL` in `src/lib/kyvky-contact.ts`). Canonical site host: `https://www.kyvky.org`.

## Copy conventions

- All user-facing copy follows `docs/voice-and-tone.md` — neutral, non-partisan, honest sourcing. Email digest copy specifics are in its §2 "Bill digest email".
