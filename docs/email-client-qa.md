# Email rendering QA checklist

Manual pass after template copy changes (especially Bill Watch alignment). Send test messages with `npm run preview:digest -- --email you@example.com --send` and welcome with `npm run preview:welcome`.

## Clients

- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Apple Mail (macOS or iOS)
- [ ] Outlook (web or desktop)

## Bill digest

- [ ] Subject line readable; preview text not truncated awkwardly
- [ ] Plain-text part present (`render(..., { plainText: true })`)
- [ ] Unsubscribe link works (GET page + one-click POST)
- [ ] Bill links use `https://kyvky.com`
- [ ] Footer: privacy, terms, preference link

## Welcome email

- [ ] Single-column layout; links to browse, profile, map
- [ ] Resend from `alerts@kyvky.com`, reply-to `katie@kyvky.com`

## Ops

- [ ] Resend domain SPF/DKIM/DMARC green before scaling audience
