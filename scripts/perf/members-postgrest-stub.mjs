// Minimal PostgREST stub for ky_legislators + ky_sources so the real Next.js app can
// build, run, and serve /members + /members/map without live Supabase credentials.
//
// Fidelity notes:
// - Unknown columns in `select=` return PostgREST's 42703 error (400), so the app's
//   missing-column fallbacks (`profile_slug` retries) are exercised for real.
// - PROFILE_SLUG=1 simulates a post-migration-042 database: the column exists and is
//   backfilled with collision-suffixed slugs (same policy as the migration).
//
// Usage:  node scripts/perf/members-postgrest-stub.mjs           # pre-042 database
//         PROFILE_SLUG=1 node scripts/perf/members-postgrest-stub.mjs
//         PORT=54321 to override the port.
// Point the app at it via .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=stub-key
import http from 'node:http';

const PORT = Number(process.env.PORT || 54321);
const WITH_PROFILE_SLUG = process.env.PROFILE_SLUG === '1';

// ---------- deterministic fixture roster ----------
const FIRST = ['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth','William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen','Christopher','Lisa','Daniel','Nancy','Matthew','Betty','Anthony','Margaret','Mark','Sandra','Donald','Ashley','Steven','Kimberly','Paul','Emily','Andrew','Donna','Joshua','Michelle'];
const LAST = ['Adkins','Baker','Carter','Dixon','Elliott','Fugate','Gibson','Hale','Isaacs','Jenkins','Keller','Lawson','Meade','Noble','Osborne','Prewitt','Quisenberry','Riley','Sexton','Turner','Underwood','Vance','Webb','Yates','Zimmerman','Abbott','Blanton','Combs','Damron','Estep','Flannery','Goforth','Hatton','Ingram','Justice','Kincaid','Lykins','McCoy','Napier','Owens'];

function uuid(n) {
  const h = n.toString(16).padStart(8, '0');
  return `${h}-0000-4000-8000-${h.padStart(12, '0')}`;
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const rows = [];
let seq = 1;

function committeeSlugs(n) {
  const all = ['appropriations-and-revenue','judiciary','health-services','education','agriculture','banking-and-insurance','economic-development-and-workforce-investment','natural-resources-and-energy','state-government','transportation','veterans-military-affairs-and-public-protection','families-and-children'];
  const out = [];
  for (let i = 0; i < 3 + (n % 4); i++) out.push(all[(n * 3 + i * 5) % all.length]);
  return [...new Set(out)];
}

function makeMember(i, chamber, districtNum, opts = {}) {
  const fi = FIRST[i % FIRST.length];
  const la = opts.last || LAST[(i * 7) % LAST.length];
  const district = chamber === 'house' ? `HD-${districtNum}` : chamber === 'senate' ? `SD-${districtNum}` : null;
  const lrcDistrictNumber = chamber === 'senate' ? 100 + districtNum : districtNum;
  const n = seq++;
  return {
    id: uuid(n),
    legiscan_id: 20000 + n,
    openstates_id: opts.noOs ? null : `ocd-person/0000${n}`,
    name: `${fi} ${la}`,
    first_name: fi,
    last_name: la,
    party: i % 4 === 0 ? 'Democratic' : 'Republican',
    chamber,
    role_title: chamber === 'house' ? 'Representative' : chamber === 'senate' ? 'Senator' : (opts.role_title ?? null),
    district,
    photo_url: null,
    email: i % 5 === 4 ? null : `${fi}.${la}@lrc.ky.gov`.toLowerCase(),
    phone: i % 3 === 0 ? '502-564-8100' : i % 3 === 1 ? `502-564-8${String(100 + (n % 900)).slice(0, 3)}` : null,
    website: i % 6 === 0 ? `https://www.${la.toLowerCase()}forky.com` : null,
    lrc_profile_url:
      chamber && i % 2 === 0
        ? `https://legislature.ky.gov/Legislators/Pages/Legislator-Profile.aspx?DistrictNumber=${lrcDistrictNumber}`
        : null,
    ballotpedia: i % 3 === 0 ? null : `https://ballotpedia.org/${fi}_${la}`,
    legiscan_image_url: null,
    committee_memberships: chamber ? committeeSlugs(n) : null,
    external_links: null,
    active: opts.active ?? true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...opts.extra,
  };
}

// Governor + Lt. Governor (chamber null)
rows.push({ ...makeMember(2, null, null, { role_title: 'Governor' }), name: 'Andy Beshear', first_name: 'Andy', last_name: 'Beshear', party: 'Democratic' });
rows.push({ ...makeMember(5, null, null, { role_title: 'lt_governor' }), name: 'Jacqueline Coleman', first_name: 'Jacqueline', last_name: 'Coleman', party: 'Democratic' });

// 100 House + 38 Senate active
for (let d = 1; d <= 100; d++) rows.push(makeMember(d, 'house', d));
for (let d = 1; d <= 38; d++) rows.push(makeMember(d + 100, 'senate', d));

// Historical inactive rows — DIFFERENT person, same seat (turnover conflicts). The active
// HD-5 / HD-42 / SD-7 cards must not link to Legislator-Profile.aspx?DistrictNumber=…
rows.push(makeMember(31, 'house', 5, { active: false, last: 'Hollenbach', noOs: true }));
rows.push(makeMember(33, 'house', 42, { active: false, last: 'Overly', noOs: true }));
rows.push(makeMember(35, 'senate', 7, { active: false, last: 'Stumbo', noOs: true }));
// Same-person duplicate rows (LegiScan-seeded twin of an Open States row) — dedupe fodder.
for (let d = 10; d <= 21; d++) {
  const active = rows.find((r) => r.district === `HD-${d}` && r.active);
  rows.push({ ...active, id: uuid(seq + 5000), openstates_id: null, legiscan_id: 30000 + seq++, email: null, phone: null, lrc_profile_url: null, active: false });
}

// Post-042 mode: backfill profile_slug with the migration's collision policy — a base slug
// shared across more than one distinct seat gets the district suffix on districted rows.
if (WITH_PROFILE_SLUG) {
  const seatsByBase = new Map();
  const seatOf = (r) => `${r.chamber ?? 'none'}:${r.district ?? r.id}`;
  for (const r of rows) {
    const base = slugify(r.name || r.id);
    if (!base) continue;
    if (!seatsByBase.has(base)) seatsByBase.set(base, new Set());
    seatsByBase.get(base).add(seatOf(r));
  }
  for (const r of rows) {
    const base = slugify(r.name || r.id);
    const conflicted = (seatsByBase.get(base)?.size ?? 0) > 1;
    const districtSlug = slugify(r.district || '');
    r.profile_slug = conflicted && districtSlug ? `${base}-${districtSlug}` : base || null;
  }
}

const LEGISLATOR_COLUMNS = new Set(Object.keys(rows[0]));

const KY_SOURCES = [
  { source_name: 'legislators', last_sync_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  { source_name: 'bills', last_sync_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
];
const SOURCE_COLUMNS = new Set(['source_name', 'last_sync_at']);

// ---------- bills + votes + committees (member profile surfaces) ----------
const activeMembers = rows.filter((r) => r.active && r.chamber);
const BILLS = [];
for (let i = 0; i < 800; i++) {
  const session = i % 3 === 0 ? '2025 Regular Session' : '2026 Regular Session';
  const primary = activeMembers[(i * 7) % activeMembers.length];
  const co1 = activeMembers[(i * 11 + 3) % activeMembers.length];
  const co2 = activeMembers[(i * 13 + 9) % activeMembers.length];
  const chamber = primary.chamber;
  const n = 100 + i;
  BILLS.push({
    id: uuid(90000 + i),
    bill_number: `${chamber === 'house' ? 'HB' : 'SB'}${n}`,
    title: `An act relating to fixture topic ${i % 40} (${session})`,
    status: ['Introduced', 'In Committee', 'Passed House', 'Chaptered'][i % 4],
    last_action_date: `2026-0${1 + (i % 6)}-1${i % 3}`,
    last_action: 'received in Senate',
    session,
    chamber,
    legiscan_id: 700000 + i,
    topics: [`topic-${i % 40}`],
    sponsors: [
      { people_id: primary.legiscan_id, name: primary.name, sponsor_type_id: 1 },
      { people_id: co1.legiscan_id, name: co1.name, sponsor_type_id: 2 },
      { people_id: co2.legiscan_id, name: co2.name, sponsor_type_id: 2 },
    ],
  });
}
const BILL_COLUMNS = new Set(Object.keys(BILLS[0]));

const COMMITTEES = ['Appropriations and Revenue', 'Judiciary', 'Health Services', 'Education', 'Agriculture', 'Transportation', 'State Government', 'Banking and Insurance'].map((name, i) => ({
  id: uuid(80000 + i),
  lrc_rsn: 9000 + i,
  committee_type: 'S',
  name,
  chamber: i % 2 === 0 ? 'house' : 'senate',
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  profile_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}));
const COMMITTEE_COLUMNS = new Set(Object.keys(COMMITTEES[0]));

// Meeting rows for the member_refs → committee-assignment path (embedded committee select).
const MEETINGS = [];
for (let i = 0; i < 120; i++) {
  const committee = COMMITTEES[i % COMMITTEES.length];
  const memberRefs = [];
  for (let m = 0; m < 12; m++) {
    const leg = activeMembers[(i * 5 + m * 17) % activeMembers.length];
    const dn = leg.chamber === 'senate' ? 100 + Number(leg.district.split('-')[1]) : Number(leg.district.split('-')[1]);
    memberRefs.push({ displayName: m === 0 ? `${leg.name} (Chair)` : leg.name, districtNumber: dn });
  }
  MEETINGS.push({ member_refs: memberRefs, ky_committees: { name: committee.name, slug: committee.slug, chamber: committee.chamber } });
}

// Roll-call votes served by the get_votes_for_legislator RPC.
const VOTES = BILLS.filter((_, i) => i % 4 !== 3).map((bill, i) => ({
  id: uuid(70000 + i),
  bill_id: bill.id,
  date: bill.last_action_date,
  chamber: bill.chamber,
  description: `Third reading, ${bill.bill_number}`,
  yea_count: 80,
  nay_count: 15,
  absent_count: 5,
  passed: true,
  roll_call: activeMembers
    .filter((m) => m.chamber === bill.chamber)
    .map((m, j) => ({ legislator_id: String(m.legiscan_id), vote: j % 7 === 0 ? 'Nay' : 'Yea' })),
  created_at: '2026-07-01T00:00:00Z',
}));

// ---------- request stats (per-table query counts — proves caching) ----------
const stats = new Map();
function bumpStat(key) {
  stats.set(key, (stats.get(key) ?? 0) + 1);
}

// ---------- PostgREST-ish query handling ----------
const TABLES = {
  ky_legislators: { rows: () => rows, columns: () => LEGISLATOR_COLUMNS },
  ky_sources: { rows: () => KY_SOURCES, columns: () => SOURCE_COLUMNS },
  ky_bills: { rows: () => BILLS, columns: () => BILL_COLUMNS },
  ky_committees: { rows: () => COMMITTEES, columns: () => COMMITTEE_COLUMNS },
};

/** JSONB containment (`sponsors=cs.[{"people_id":123}]`) — subset match on array elements. */
function jsonbContains(value, needle) {
  if (!Array.isArray(value) || !Array.isArray(needle)) return false;
  return needle.every((want) =>
    value.some(
      (el) =>
        el && typeof el === 'object' && Object.entries(want).every(([k, v]) => el[k] === v),
    ),
  );
}

function applyQuery(table, params) {
  // ky_committee_meetings uses an embedded committee select — return pre-shaped rows.
  if (table === 'ky_committee_meetings') {
    const limit = params.get('limit');
    const data = limit ? MEETINGS.slice(0, parseInt(limit, 10)) : [...MEETINGS];
    return { status: 200, body: data };
  }
  const def = TABLES[table];
  if (!def) return { status: 200, body: [] };
  const known = def.columns();
  const select = params.get('select');
  if (select && select !== '*') {
    for (const col of select.split(',').map((s) => s.trim())) {
      if (!known.has(col)) {
        return {
          status: 400,
          body: { code: '42703', details: null, hint: null, message: `column ${table}.${col} does not exist` },
        };
      }
    }
  }
  let data = [...def.rows()];
  for (const [key, value] of params.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset' || key === 'apikey') continue;
    let m = /^eq\.(.*)$/.exec(value);
    if (m) {
      const want = m[1] === 'true' ? true : m[1] === 'false' ? false : m[1];
      data = data.filter((r) => r[key] === want);
      continue;
    }
    m = /^cs\.(.*)$/.exec(value);
    if (m) {
      let needle = null;
      try {
        needle = JSON.parse(m[1]);
      } catch {
        /* unsupported containment literal */
      }
      data = data.filter((r) => jsonbContains(r[key], needle));
      continue;
    }
    m = /^in\.\((.*)\)$/.exec(value);
    if (m) {
      const wants = new Set(m[1].split(',').map((s) => s.trim().replace(/^"|"$/g, '')));
      data = data.filter((r) => wants.has(String(r[key])));
      continue;
    }
    if (value === 'not.is.null') {
      data = data.filter((r) => r[key] != null);
    }
  }
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    data.sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'desc' ? -1 : 1));
  }
  if (select && select !== '*') {
    const cols = select.split(',').map((s) => s.trim());
    data = data.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
  }
  const limit = params.get('limit');
  if (limit) data = data.slice(0, parseInt(limit, 10));
  return { status: 200, body: data };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  // Per-table query counters — the honest cache metric (each count = one Supabase round
  // trip in production). GET /__stats returns them; /__stats?reset=1 zeroes first.
  if (url.pathname === '/__stats') {
    if (url.searchParams.get('reset') === '1') stats.clear();
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(Object.fromEntries(stats)));
    return;
  }
  const rpcMatch = /^\/rest\/v1\/rpc\/(\w+)$/.exec(url.pathname);
  if (rpcMatch && req.method === 'POST') {
    bumpStat(`rpc:${rpcMatch[1]}`);
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body = [];
      if (rpcMatch[1] === 'get_votes_for_legislator') {
        try {
          const args = JSON.parse(raw || '{}');
          const pid = String(args.legislator_people_id ?? '');
          const max = Number(args.max_rows ?? 200);
          body = VOTES.filter(
            (v) =>
              (!args.p_session || BILLS.find((b) => b.id === v.bill_id)?.session === args.p_session) &&
              v.roll_call.some((r) => r.legislator_id === pid),
          ).slice(0, max);
        } catch {
          body = [];
        }
      }
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
    return;
  }
  const restMatch = /^\/rest\/v1\/(\w+)$/.exec(url.pathname);
  if (restMatch && (req.method === 'GET' || req.method === 'HEAD')) {
    const table = restMatch[1];
    bumpStat(table);
    const { status, body } = applyQuery(table, url.searchParams);
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json' });
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body));
    return;
  }
  if (url.pathname.startsWith('/auth/v1/')) {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ user: null, session: null }));
    return;
  }
  res.writeHead(404, cors);
  res.end('{}');
});

server.listen(PORT, '127.0.0.1', () => {
  const active = rows.filter((r) => r.active).length;
  console.log(
    `postgrest-stub on :${PORT} — ${rows.length} legislator rows (${active} active), profile_slug ${WITH_PROFILE_SLUG ? 'ON (post-042)' : 'OFF (pre-042)'}`,
  );
});
