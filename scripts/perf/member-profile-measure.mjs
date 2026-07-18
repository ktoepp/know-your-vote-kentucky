// Measure /members/[slug] (member profile): server fanout (stub query counts, cold vs
// warm), response time + payload size, and client long tasks under 4x CPU throttle.
// Pair with members-postgrest-stub.mjs. Usage: node member-profile-measure.mjs <port> <label>
import { chromium } from 'playwright';
import fs from 'node:fs';

const port = process.argv[2];
const label = process.argv[3] || 'run';
const BASE = `http://127.0.0.1:${port}`;
const STUB = 'http://127.0.0.1:54321';
const out = { label, port };

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const roster = (await (await fetch(`${BASE}/api/roster/members`)).json()).roster ?? [];
const target = roster.filter((r) => r.chamber === 'house')[10];
const slug = target.profile_slug || slugify(target.name);
const profileUrl = `${BASE}/members/${slug}`;
out.slug = slug;

// ---------- server: query fanout + response times ----------
await fetch(`${STUB}/__stats?reset=1`);
const times = [];
for (let i = 0; i < 5; i++) {
  const t0 = Date.now();
  const res = await fetch(profileUrl, { headers: { 'x-perf-run': String(i) } });
  const body = await res.text();
  times.push(Date.now() - t0);
  if (i === 0) {
    out.htmlBytes = body.length;
    out.status = res.status;
    out.queriesCold = Object.fromEntries(
      Object.entries(await (await fetch(`${STUB}/__stats`)).json()).sort(),
    );
    await fetch(`${STUB}/__stats?reset=1`);
  }
}
out.responseMsColdThenWarm = times;
// Queries issued by the 4 warm requests combined (cached build => near zero).
out.queriesWarm4x = Object.fromEntries(
  Object.entries(await (await fetch(`${STUB}/__stats`)).json()).sort(),
);

// ---------- client: hydration long tasks ----------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.addInitScript(() => {
  window.__lt = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lt.push(e.duration);
  }).observe({ type: 'longtask', buffered: true });
});
const t0 = Date.now();
await page.goto(profileUrl, { waitUntil: 'load' });
await page.getByText(/Sponsored bills|No sponsored bills/i).first().waitFor({ timeout: 15000 });
out.loadToContentMs = Date.now() - t0;
await page.waitForTimeout(2500);
out.clientLongTasks = await page.evaluate(() => ({
  count: window.__lt.length,
  totalMs: Math.round(window.__lt.reduce((s, d) => s + d, 0)),
}));
await page.screenshot({ path: `shot-profile-${label}.png`, fullPage: false });
await browser.close();

fs.writeFileSync(`metrics-profile-${label}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
