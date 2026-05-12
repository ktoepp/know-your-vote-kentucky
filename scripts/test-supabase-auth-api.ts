#!/usr/bin/env npx tsx
/**
 * Reachability checks for Supabase Auth (uses .env / .env.local via load-env).
 * Does not print secrets. Does not create users or send email.
 */
import './load-env';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = {
  apikey: anon,
  Authorization: `Bearer ${anon}`,
};

async function main() {
  const settingsRes = await fetch(`${url}/auth/v1/settings`, { headers });
  console.log(`GET /auth/v1/settings → HTTP ${settingsRes.status}`);
  if (!settingsRes.ok) {
    console.error(await settingsRes.text());
    process.exit(1);
  }
  const settings = (await settingsRes.json()) as Record<string, unknown>;
  const pick = ['external', 'disable_signup', 'mailer_autoconfirm'];
  for (const k of pick) {
    if (k in settings) console.log(`  ${k}:`, JSON.stringify(settings[k]));
  }

  const restRes = await fetch(`${url}/rest/v1/`, { headers });
  const restNote =
    restRes.status === 401 || restRes.status === 403
      ? 'PostgREST is up (anon blocked from browsing / — normal)'
      : `HTTP ${restRes.status}`;
  console.log(`GET /rest/v1/ → ${restNote}`);

  console.log('\nAuth API is reachable. SMTP/Resend delivery is configured in the Supabase Dashboard;');
  console.log('confirm by signing up a test user or checking Resend → Logs after a forgot-password flow.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
