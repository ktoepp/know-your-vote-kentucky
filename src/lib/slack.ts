/**
 * Slack notification utility for Know Your Vote Kentucky.
 *
 * Sends structured messages to configured Slack webhooks.
 * All functions are no-ops when SLACK_WEBHOOK_URL is not set.
 *
 * Environment variables:
 *   SLACK_WEBHOOK_URL        — general / errors channel (required)
 *   SLACK_WEBHOOK_ALERTS     — high-priority alerts (falls back to SLACK_WEBHOOK_URL)
 *   SLACK_WEBHOOK_SYNC       — data sync events (falls back to SLACK_WEBHOOK_URL)
 */

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
}

async function post(payload: SlackMessage, webhookUrl?: string): Promise<boolean> {
  const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function contextBlock(text: string): SlackBlock {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text }],
  };
}

function divider(): SlackBlock {
  return { type: "divider" };
}

/**
 * Send a plain text message to the general channel.
 */
export async function sendSlackMessage(text: string): Promise<boolean> {
  return post({ text });
}

/**
 * Notify on a critical error (server errors, uncaught exceptions, etc.).
 */
export async function sendErrorAlert(opts: {
  title: string;
  message: string;
  details?: Record<string, string | number | boolean>;
  url?: string;
}): Promise<boolean> {
  const fields =
    opts.details
      ? Object.entries(opts.details).map(([k, v]) => ({
          type: "mrkdwn",
          text: `*${k}:*\n${v}`,
        }))
      : [];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Error: ${opts.title}`, emoji: false },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: opts.message },
    },
  ];

  if (fields.length > 0) {
    blocks.push({ type: "section", fields: fields.slice(0, 10) });
  }

  if (opts.url) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `<${opts.url}|View in Sentry>` },
    });
  }

  blocks.push(contextBlock(`know-your-vote-kentucky • ${new Date().toISOString()}`));

  return post(
    { text: `Error: ${opts.title}`, blocks },
    process.env.SLACK_WEBHOOK_ALERTS || process.env.SLACK_WEBHOOK_URL,
  );
}

/**
 * Notify when a data sync completes (bills, legislators, votes, etc.).
 */
export async function sendSyncNotification(opts: {
  syncType: string;
  status: "success" | "partial" | "failed";
  summary: string;
  stats?: Record<string, number>;
  durationMs?: number;
}): Promise<boolean> {
  const icon = { success: "[OK]", partial: "[WARN]", failed: "[FAIL]" }[opts.status];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${icon} Sync: ${opts.syncType}`, emoji: false },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: opts.summary },
    },
  ];

  if (opts.stats && Object.keys(opts.stats).length > 0) {
    const fields = Object.entries(opts.stats).map(([k, v]) => ({
      type: "mrkdwn",
      text: `*${k}:*\n${v}`,
    }));
    blocks.push({ type: "section", fields: fields.slice(0, 10) });
  }

  const ctx = [
    `know-your-vote-kentucky`,
    opts.durationMs != null ? `${(opts.durationMs / 1000).toFixed(1)}s` : null,
    new Date().toISOString(),
  ]
    .filter(Boolean)
    .join(" • ");

  blocks.push(contextBlock(ctx));

  return post(
    { text: `${icon} Sync ${opts.syncType}: ${opts.status}`, blocks },
    process.env.SLACK_WEBHOOK_SYNC || process.env.SLACK_WEBHOOK_URL,
  );
}

/**
 * Notify on a deployment event (start, success, failure).
 */
export async function sendDeploymentNotification(opts: {
  environment: string;
  status: "started" | "succeeded" | "failed";
  commitSha?: string;
  url?: string;
}): Promise<boolean> {
  const icon = { started: "[DEPLOY]", succeeded: "[OK]", failed: "[FAIL]" }[opts.status];

  const parts = [
    `*Environment:*\n${opts.environment}`,
    opts.commitSha ? `*Commit:*\n\`${opts.commitSha.slice(0, 7)}\`` : null,
  ].filter(Boolean) as string[];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${icon} Deploy ${opts.status}: ${opts.environment}`,
        emoji: false,
      },
    },
    { type: "section", fields: parts.map((t) => ({ type: "mrkdwn", text: t })) },
  ];

  if (opts.url) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `<${opts.url}|View deployment>` },
    });
  }

  blocks.push(divider());
  blocks.push(contextBlock(`know-your-vote-kentucky • ${new Date().toISOString()}`));

  return post(
    { text: `${icon} Deploy ${opts.status}: ${opts.environment}`, blocks },
    process.env.SLACK_WEBHOOK_URL,
  );
}

/**
 * Send a general-purpose alert (e.g. rate limit hit, third-party API down).
 */
export async function sendAlert(opts: {
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  details?: Record<string, string | number | boolean>;
}): Promise<boolean> {
  const icon = { info: "[INFO]", warning: "[WARN]", critical: "[CRITICAL]" }[opts.severity];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${icon} ${opts.title}`, emoji: false },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: opts.body },
    },
  ];

  if (opts.details && Object.keys(opts.details).length > 0) {
    const fields = Object.entries(opts.details).map(([k, v]) => ({
      type: "mrkdwn",
      text: `*${k}:*\n${v}`,
    }));
    blocks.push({ type: "section", fields: fields.slice(0, 10) });
  }

  blocks.push(contextBlock(`know-your-vote-kentucky • ${new Date().toISOString()}`));

  const webhook =
    opts.severity === "critical"
      ? process.env.SLACK_WEBHOOK_ALERTS || process.env.SLACK_WEBHOOK_URL
      : process.env.SLACK_WEBHOOK_URL;

  return post({ text: `${icon} ${opts.title}`, blocks }, webhook);
}
