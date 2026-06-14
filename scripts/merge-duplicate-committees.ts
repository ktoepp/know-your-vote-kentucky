/**
 * Merge duplicate ky_committees records (seed-code vs LRC full-label committee_type).
 *
 * Root cause: ky_committees upserts on (lrc_rsn, committee_type), and LRC changed the
 * CommitteeType URL param from short codes ('IJ', 'S' — also used by the migration 027
 * seed) to full labels ('Interim Joint Committee', 'Statutory Committee'). Same
 * committee, two rows, data split across them.
 *
 * Survivor rule (auto mode): rows sharing an lrc_rsn where exactly one has a full-label
 * committee_type (contains a space) — the full-label row survives, because that is what
 * the live LRC calendar emits today; merging the other direction would let the next
 * calendar sync recreate the duplicate.
 *
 * Idempotent: merged losers are deleted, so re-runs find nothing to do. The loser's slug
 * is appended to the survivor's `aliases` (migration 030) so old URLs redirect.
 *
 * DRY-RUN BY DEFAULT — pass --live to write. Every run prints the full action plan;
 * live runs also write a JSON change report under reports/.
 *
 * Usage:
 *   npm run merge:duplicate-committees                          # dry-run, auto-detect
 *   npm run merge:duplicate-committees -- --pair=loser:survivor # explicit pair(s)
 *   npm run merge:duplicate-committees:live                     # apply
 */
import './load-env';
import { writeFileSync, mkdirSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const live = args.includes('--live');
const explicitPairs = args
  .filter((a) => a.startsWith('--pair='))
  .map((a) => a.slice('--pair='.length))
  .map((spec) => {
    const [loser, survivor] = spec.split(':');
    if (!loser || !survivor) {
      console.error(`Bad --pair spec "${spec}" — expected loserSlug:survivorSlug`);
      process.exit(1);
    }
    return { loser, survivor };
  });

interface CommitteeRow {
  id: string;
  lrc_rsn: number | null;
  committee_type: string | null;
  name: string;
  slug: string;
  aliases?: string[] | null;
}

type Action = { step: string; detail: string };

function isFullLabelType(t: string | null): boolean {
  return !!t && t.includes(' ');
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
  const db = createClient(url, key);

  // aliases column (migration 030) is required for redirects; hard-require in live mode.
  const aliasProbe = await db.from('ky_committees').select('aliases').limit(1);
  const hasAliases = !aliasProbe.error;
  if (!hasAliases) {
    const msg = 'ky_committees.aliases missing — apply supabase/migrations/030_ky_committees_aliases.sql first';
    if (live) { console.error(`[merge] ABORT: ${msg}`); process.exit(1); }
    console.warn(`[merge] WARNING (dry-run continues): ${msg}`);
  }

  const { data: rows, error } = await db
    .from('ky_committees')
    .select(hasAliases ? 'id, lrc_rsn, committee_type, name, slug, aliases' : 'id, lrc_rsn, committee_type, name, slug');
  if (error) { console.error('DB fetch failed:', error.message); process.exit(1); }
  const committees = (rows ?? []) as CommitteeRow[];
  const bySlug = new Map(committees.map((c) => [c.slug, c]));

  // --- Resolve pairs ---------------------------------------------------------
  const pairs: Array<{ loser: CommitteeRow; survivor: CommitteeRow }> = [];
  if (explicitPairs.length > 0) {
    for (const p of explicitPairs) {
      const loser = bySlug.get(p.loser);
      const survivor = bySlug.get(p.survivor);
      if (!loser || !survivor) {
        console.error(`[merge] Pair ${p.loser}:${p.survivor} — slug not found (${!loser ? p.loser : p.survivor})`);
        process.exit(1);
      }
      if (loser.lrc_rsn !== survivor.lrc_rsn) {
        console.warn(`[merge] WARNING: ${p.loser} (rsn=${loser.lrc_rsn}) and ${p.survivor} (rsn=${survivor.lrc_rsn}) have different lrc_rsn — merging anyway per explicit --pair`);
      }
      pairs.push({ loser, survivor });
    }
  } else {
    const byRsn = new Map<number, CommitteeRow[]>();
    for (const c of committees) {
      if (c.lrc_rsn == null) continue;
      const arr = byRsn.get(c.lrc_rsn) ?? [];
      arr.push(c);
      byRsn.set(c.lrc_rsn, arr);
    }
    for (const [rsn, group] of byRsn) {
      if (group.length < 2) continue;
      const full = group.filter((c) => isFullLabelType(c.committee_type));
      const short = group.filter((c) => !isFullLabelType(c.committee_type));
      if (group.length === 2 && full.length === 1 && short.length === 1) {
        pairs.push({ loser: short[0], survivor: full[0] });
      } else {
        console.warn(`[merge] SKIP rsn=${rsn}: ${group.length} rows but not a clean short/full split — resolve with explicit --pair`);
        group.forEach((c) => console.warn(`         ${c.slug} (type=${c.committee_type})`));
      }
    }
  }

  if (pairs.length === 0) {
    console.log('[merge] No mergeable pairs found — nothing to do.');
    return;
  }
  console.log(`[merge] ${live ? 'LIVE' : 'DRY-RUN'} — ${pairs.length} pair(s)\n`);

  const report: Array<{ loser: string; survivor: string; actions: Action[] }> = [];

  for (const { loser, survivor } of pairs) {
    const actions: Action[] = [];
    const act = async (step: string, detail: string, fn?: () => Promise<{ error: { message: string } | null }>) => {
      actions.push({ step, detail });
      console.log(`  - ${step}: ${detail}`);
      if (live && fn) {
        const { error: err } = await fn();
        if (err) throw new Error(`${step} failed (${loser.slug} → ${survivor.slug}): ${err.message}`);
      }
    };

    console.log(`\n=== ${loser.slug} (type=${loser.committee_type}) → ${survivor.slug} (type=${survivor.committee_type}) ===`);

    // 1. Meetings — move, or merge into a same-date survivor meeting. Date-only
    //    matching is deliberate: the loser's meetings come from the PDF backfill /
    //    older syncs with terse time strings ("11:00 ET") while the survivor's
    //    calendar-scraped rows carry the full form ("11:00 am ET / 10:00 am CT,
    //    Annex Room 154") — same real-world meeting, different text. The survivor's
    //    row (fresher, actively synced) wins.
    const [{ data: sMeetings }, { data: lMeetings }] = await Promise.all([
      db.from('ky_committee_meetings').select('id, meeting_date, time_and_location').eq('committee_id', survivor.id),
      db.from('ky_committee_meetings').select('id, meeting_date, time_and_location').eq('committee_id', loser.id),
    ]);
    const sByDate = new Map<string, string>();
    for (const m of sMeetings ?? []) {
      if (!sByDate.has(m.meeting_date as string)) sByDate.set(m.meeting_date as string, m.id as string);
    }

    for (const lm of lMeetings ?? []) {
      const matchId = sByDate.get(lm.meeting_date as string);
      if (!matchId) {
        await act('move-meeting', `${lm.meeting_date} (${lm.id})`, () =>
          db.from('ky_committee_meetings').update({ committee_id: survivor.id }).eq('id', lm.id));
        continue;
      }
      // Collision: survivor already has this meeting. Merge children, then drop the loser meeting.
      const { count: sItemCount } = await db
        .from('ky_committee_agenda_items').select('id', { count: 'exact', head: true }).eq('meeting_id', matchId);
      if ((sItemCount ?? 0) > 0) {
        await act('drop-duplicate-agenda', `loser meeting ${lm.meeting_date} — survivor meeting already has ${sItemCount} agenda items`, () =>
          db.from('ky_committee_agenda_items').delete().eq('meeting_id', lm.id));
      } else {
        await act('move-agenda-items', `loser meeting ${lm.meeting_date} → survivor meeting ${matchId}`, () =>
          db.from('ky_committee_agenda_items').update({ meeting_id: matchId }).eq('meeting_id', lm.id));
      }
      await act('repoint-materials-meeting', `materials on loser meeting ${lm.meeting_date} → survivor meeting`, () =>
        db.from('ky_committee_materials').update({ meeting_id: matchId }).eq('meeting_id', lm.id));
      // Events on the collided meeting: survivor may already hold the same event row.
      const { data: lmEvents } = await db
        .from('ky_committee_events').select('id, event_type, event_payload').eq('meeting_id', lm.id);
      for (const ev of lmEvents ?? []) {
        await act('repoint-event', `${ev.event_type} on collided meeting ${lm.meeting_date}`, async () => {
          const res = await db.from('ky_committee_events')
            .update({ committee_id: survivor.id, meeting_id: matchId }).eq('id', ev.id);
          if (res.error && res.error.code === '23505') {
            return db.from('ky_committee_events').delete().eq('id', ev.id);
          }
          return res;
        });
      }
      await act('delete-duplicate-meeting', `${lm.meeting_date} (${lm.id})`, () =>
        db.from('ky_committee_meetings').delete().eq('id', lm.id));
    }

    // 2. Materials — survivor keeps its copy on URL collision (materials sync wrote
    //    identical sets to both rows), otherwise re-point.
    const [{ data: sMats }, { data: lMats }] = await Promise.all([
      db.from('ky_committee_materials').select('id, url').eq('committee_id', survivor.id),
      db.from('ky_committee_materials').select('id, url').eq('committee_id', loser.id),
    ]);
    const sUrls = new Set((sMats ?? []).map((m) => m.url as string));
    const dupMats = (lMats ?? []).filter((m) => sUrls.has(m.url as string));
    const moveMats = (lMats ?? []).filter((m) => !sUrls.has(m.url as string));
    if (dupMats.length > 0) {
      await act('drop-duplicate-materials', `${dupMats.length} loser materials already on survivor (same url)`, () =>
        db.from('ky_committee_materials').delete().in('id', dupMats.map((m) => m.id)));
    }
    if (moveMats.length > 0) {
      await act('move-materials', `${moveMats.length} materials`, () =>
        db.from('ky_committee_materials').update({ committee_id: survivor.id }).in('id', moveMats.map((m) => m.id)));
    }

    // 3. Remaining events (their meetings were moved above, or meeting_id is null).
    const { data: lEvents } = await db
      .from('ky_committee_events').select('id, event_type').eq('committee_id', loser.id);
    for (const ev of lEvents ?? []) {
      await act('move-event', `${ev.event_type} (${ev.id})`, async () => {
        const res = await db.from('ky_committee_events').update({ committee_id: survivor.id }).eq('id', ev.id);
        if (res.error && res.error.code === '23505') {
          return db.from('ky_committee_events').delete().eq('id', ev.id);
        }
        return res;
      });
    }

    // 4. Follows — dedupe per user.
    const [{ data: sFollows }, { data: lFollows }] = await Promise.all([
      db.from('ky_committee_follows').select('user_id').eq('committee_id', survivor.id),
      db.from('ky_committee_follows').select('user_id').eq('committee_id', loser.id),
    ]);
    const sUserIds = new Set((sFollows ?? []).map((f) => f.user_id as string));
    for (const f of lFollows ?? []) {
      const userId = f.user_id as string;
      if (sUserIds.has(userId)) {
        await act('drop-duplicate-follow', `user ${userId} already follows survivor`, () =>
          db.from('ky_committee_follows').delete().eq('committee_id', loser.id).eq('user_id', userId));
      } else {
        await act('move-follow', `user ${userId}`, async () => {
          const ins = await db.from('ky_committee_follows').insert({ user_id: userId, committee_id: survivor.id });
          if (ins.error && ins.error.code !== '23505') return ins;
          return db.from('ky_committee_follows').delete().eq('committee_id', loser.id).eq('user_id', userId);
        });
      }
    }

    // 5. Legislator membership slug arrays.
    const { data: legs } = await db
      .from('ky_legislators').select('id, name, committee_memberships').contains('committee_memberships', [loser.slug]);
    for (const leg of legs ?? []) {
      const current = (leg.committee_memberships ?? []) as string[];
      const next = [...new Set(current.map((s) => (s === loser.slug ? survivor.slug : s)))];
      await act('update-membership', `${leg.name}: ${loser.slug} → ${survivor.slug}`, () =>
        db.from('ky_legislators').update({ committee_memberships: next }).eq('id', leg.id));
    }

    // 6. Alias, then delete the loser row.
    if (hasAliases) {
      const aliases = [...new Set([...(survivor.aliases ?? []), loser.slug, ...((loser.aliases ?? []) as string[])])];
      await act('add-alias', `survivor.aliases += ${loser.slug}`, () =>
        db.from('ky_committees').update({ aliases }).eq('id', survivor.id));
    }
    await act('delete-loser', `${loser.slug} (${loser.id})`, () =>
      db.from('ky_committees').delete().eq('id', loser.id));

    report.push({ loser: loser.slug, survivor: survivor.slug, actions });
  }

  console.log(`\n[merge] ${live ? 'Applied' : 'Planned (dry-run, nothing written)'}: ${pairs.length} pair(s), ${report.reduce((n, r) => n + r.actions.length, 0)} action(s).`);
  if (live) {
    mkdirSync('reports', { recursive: true });
    const out = `reports/committee-merge-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`[merge] Change report written to ${out}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
