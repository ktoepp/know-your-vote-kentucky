/**
 * Which Slack webhooks a Sentry alert goes to.
 *
 * Every forwarded Sentry alert goes to `#errors` (SLACK_WEBHOOK_ERRORS, then
 * SLACK_WEBHOOK_ALERTS, then SLACK_WEBHOOK_URL). An issue-alert rule whose name
 * starts with `[page]` also goes to the page channel (SLACK_WEBHOOK_SUPPORT),
 * the same channel the health check, source-health breaches, sync crashes and
 * LegiScan quota bands use. See docs/ops/README.md "What pages you".
 *
 * Pure functions: no I/O, so they can be tested without calling Slack.
 */

/** Reads SLACK_WEBHOOK_ERRORS, _ALERTS, _URL and _SUPPORT; `process.env` fits. */
export type AlertRoutingEnv = Readonly<Record<string, string | undefined>>;

const PAGE_PREFIX = '[page]';

/** True when the trimmed rule name starts with `[page]`, case-insensitive. */
export function isPageRule(rule: string | undefined): boolean {
  if (!rule) return false;
  return rule.trim().toLowerCase().startsWith(PAGE_PREFIX);
}

/**
 * Slack incoming-webhook URLs for one Sentry alert: the `#errors` URL (existing
 * fallback order), plus the support URL when the rule pages and it is set.
 * Duplicates are removed, so a support URL equal to the errors URL posts once.
 */
export function sentrySlackTargets(rule: string | undefined, env: AlertRoutingEnv): string[] {
  const targets = new Set<string>();
  const errorsUrl =
    env.SLACK_WEBHOOK_ERRORS?.trim() ||
    env.SLACK_WEBHOOK_ALERTS?.trim() ||
    env.SLACK_WEBHOOK_URL?.trim() ||
    '';
  if (errorsUrl) targets.add(errorsUrl);
  const supportUrl = env.SLACK_WEBHOOK_SUPPORT?.trim() || '';
  if (supportUrl && isPageRule(rule)) targets.add(supportUrl);
  return [...targets];
}
