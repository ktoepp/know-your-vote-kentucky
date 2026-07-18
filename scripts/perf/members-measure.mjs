// Drive /members on a running production server and capture behavior + responsiveness
// metrics under 4x CPU throttle. Pair with members-postgrest-stub.mjs (see README.md).
//
// Usage: node scripts/perf/members-measure.mjs <appPort> <label>
//   CHROMIUM_PATH=/path/to/chrome overrides the browser binary (defaults to Playwright's).
// Requires the `playwright` package (npm i --no-save playwright).
import { chromium } from 'playwright';
import fs from 'node:fs';

const port = process.argv[2];
const label = process.argv[3] || 'run';
const BASE = `http://127.0.0.1:${port}`;
const out = { label, port };

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ---------- API payload checks (1a) ----------
const apiRes = await fetch(`${BASE}/api/roster/members`);
const apiText = await apiRes.text();
const roster = JSON.parse(apiText).roster ?? [];
out.api = {
  bytes: apiText.length,
  rows: roster.length,
  inactiveRows: roster.filter((r) => r.active === false).length,
  withLinkSafetyFlag: roster.filter((r) => typeof r.lrc_district_link_unsafe === 'boolean').length,
  withProfileSlug: roster.filter((r) => typeof r.profile_slug === 'string' && r.profile_slug).length,
};

// Deep-link target beyond the first load-more page: 30th house member by last name.
const houseSorted = roster
  .filter((r) => r.chamber === 'house')
  .sort((a, b) => String(a.last_name || '').localeCompare(String(b.last_name || '')));
const deepTarget = houseSorted[29] ?? null;
const deepSlug = deepTarget ? deepTarget.profile_slug || slugify(deepTarget.name) : null;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

await page.addInitScript(() => {
  window.__perf = { events: [], longtasks: [] };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__perf.events.push({ name: e.name, duration: e.duration, startTime: e.startTime });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      window.__perf.longtasks.push({ duration: e.duration, startTime: e.startTime });
    }
  }).observe({ type: 'longtask', buffered: true });
});

const snapPerf = () =>
  page.evaluate(() => {
    const snap = window.__perf;
    window.__perf = { events: [], longtasks: [] };
    return snap;
  });

function summarize(perf) {
  const evDur = perf.events.map((e) => e.duration);
  const ltTotal = perf.longtasks.reduce((s, t) => s + t.duration, 0);
  return {
    interactionEvents: evDur.length,
    maxEventMs: evDur.length ? Math.max(...evDur) : 0,
    eventsOver100ms: evDur.filter((d) => d > 100).length,
    longTaskTotalMs: Math.round(ltTotal),
    longTasks: perf.longtasks.length,
  };
}

// ---------- 1. Initial load ----------
const t0 = Date.now();
await page.goto(`${BASE}/members`, { waitUntil: 'load' });
await page.getByText(/140 members/).waitFor({ timeout: 15000 });
out.loadToRosterMs = Date.now() - t0;
await page.waitForTimeout(2500);
const initialPerf = await snapPerf();
out.initial = {
  longTaskTotalMs: Math.round(initialPerf.longtasks.reduce((s, t) => s + t.duration, 0)),
  longTasks: initialPerf.longtasks.length,
};
await page.screenshot({ path: `shot-${label}-initial.png`, fullPage: false });

// ---------- 2. Typing responsiveness ----------
const search = page.getByPlaceholder('Search by name or district…');
await search.click();
await snapPerf();
for (const phase of ['abbott', 'sexton', 'hd-4']) {
  await search.fill('');
  await page.keyboard.type(phase, { delay: 80 });
  await page.waitForTimeout(400);
}
await page.waitForTimeout(600);
out.typing = summarize(await snapPerf());
await search.fill('');

// ---------- 3. Load more clicks (House section) ----------
await page.getByText(/Showing 24 of/).first().waitFor({ timeout: 10000 });
await page.waitForTimeout(400);
await snapPerf();
const clickDurations = [];
for (let i = 0; i < 4; i++) {
  const btn = page.getByRole('button', { name: 'Load more' }).first();
  if (!(await btn.isVisible().catch(() => false))) break;
  await btn.click();
  await page.waitForTimeout(900);
  const p = await snapPerf();
  clickDurations.push(summarize(p).maxEventMs);
}
out.loadMoreMaxEventMs = clickDurations;

// ---------- 4. Chamber filter toggle ----------
await snapPerf();
await page.getByRole('button', { name: 'Senate' }).click();
await page.waitForTimeout(900);
out.senateToggle = summarize(await snapPerf());
await page.getByRole('button', { name: 'All', exact: true }).click();
await page.waitForTimeout(900);

// ---------- 5. LRC link behavior parity (seat-conflict rules) ----------
for (let i = 0; i < 8; i++) {
  const btn = page.getByRole('button', { name: 'Load more' }).first();
  if (!(await btn.isVisible().catch(() => false))) break;
  await btn.click();
  await page.waitForTimeout(500);
}
out.lrcLinks = await page.evaluate(() => {
  const findCard = (district) => {
    for (const card of document.querySelectorAll('[data-variant="member"]')) {
      if (new RegExp(`House District ${district}(?!\\d)`).test(card.textContent || '')) return card;
    }
    return null;
  };
  const linkOf = (card) => {
    if (!card) return 'CARD NOT FOUND';
    for (const a of card.querySelectorAll('a')) {
      if ((a.textContent || '').includes('KY Legislature')) return a.getAttribute('href');
    }
    return 'NO KY LEGISLATURE LINK';
  };
  return {
    hd8_noConflict: linkOf(findCard(8)), // stored DistrictNumber=8 URL survives
    hd5_conflictInferred: linkOf(findCard(5)), // inferred URL suppressed -> chamber roster
    hd42_conflictStored: linkOf(findCard(42)), // stored DistrictNumber URL suppressed -> chamber roster
  };
});

// ---------- 6. Deep link past the first page: auto-expand + scroll (1b) ----------
// about:blank between hash probes: a same-path goto that only changes the hash is a
// fragment navigation (no reload), but real deep-link arrivals are fresh document loads.
if (deepSlug) {
  await page.goto('about:blank');
  await page.goto(`${BASE}/members#${deepSlug}`, { waitUntil: 'load' });
  await page.getByText(/140 members/).waitFor({ timeout: 15000 });
  await page.waitForTimeout(2500);
  out.deepLink = {
    slug: deepSlug,
    cardMounted: await page.evaluate((id) => Boolean(document.getElementById(id)), deepSlug),
    scrollY: await page.evaluate(() => Math.round(window.scrollY)),
  };
  // Typing must not hijack the scroll back to the hash target.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.getByPlaceholder('Search by name or district…').click();
  await page.keyboard.type('abb', { delay: 80 });
  await page.waitForTimeout(1500);
  out.deepLink.scrollYAfterTyping = await page.evaluate(() => Math.round(window.scrollY));
}

// ---------- 7. Legacy alias hash (#name-slug) still lands on the (suffixed) card ----------
await page.goto('about:blank');
await page.goto(`${BASE}/members#jessica-abbott`, { waitUntil: 'load' });
await page.getByText(/140 members/).waitFor({ timeout: 15000 });
await page.waitForTimeout(2000);
out.legacyAliasHashScrollY = await page.evaluate(() => Math.round(window.scrollY));

await browser.close();
fs.writeFileSync(`metrics-${label}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
