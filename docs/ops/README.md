# Operations

Runbooks and operating notes for KYvKY. WS9-01 completes the paging table below.

## What pages you

| Alert | Where it comes from | Channel | First action |
|---|---|---|---|
| LegiScan quota band | 90/95/98/100% of the monthly limit, edge-triggered, posted after a sync run (`src/lib/slack-webhook.ts`) | `#errors` and `SLACK_WEBHOOK_SUPPORT` | [LegiScan runbook](runbooks/legiscan.md): First 15 minutes |

## Runbooks

- [LegiScan: quota and ban risk](runbooks/legiscan.md)
