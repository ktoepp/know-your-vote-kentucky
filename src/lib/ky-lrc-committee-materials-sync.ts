/**
 * Sync LRC Committee Documents pages → ky_committee_materials.
 *
 * For each row in ky_committees that has an lrc_rsn, fetch
 * https://apps.legislature.ky.gov/CommitteeDocuments/{rsn}, parse the
 * Meeting Materials section, and upsert one ky_committee_materials row per
 * file link. Idempotent by (committee_id, url).
 *
 * See docs/specs/committee-calendar.md § Phase 5+.
 */
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  lrcCommitteeDocumentsUrl,
  parseCommitteeMaterialsHtml,
  type LrcCommitteeMaterialsParseResult,
} from './lrc-committee-materials-parser';

const SOURCE = 'lrc-committee-materials';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-committee-materials-sync)',
  Accept: 'text/html',
};

function log(msg: string) {
  console.log(`[Sync:${SOURCE}] ${msg}`);
}

function logError(msg: string) {
  console.error(`[Sync:${SOURCE}] ERROR: ${msg}`);
}

export interface KyLrcCommitteeMaterialsSyncOptions {
  /** When set, only sync these committee UUIDs (otherwise: every committee with lrc_rsn). */
  committeeIds?: string[];
  /** When set, only sync committees whose `committee_type` matches one of these. */
  committeeTypes?: string[];
  /** Hard cap on committees processed per run (sync is paged through all otherwise). */
  limit?: number;
  /** Pause between committee fetches (ms). Default 250ms — be polite. */
  delayMs?: number;
  /** When true, parse + report what would change but don't write. */
  dryRun?: boolean;
}

export interface KyLrcCommitteeMaterialsSyncStats {
  committeesProcessed: number;
  committeesWithMaterials: number;
  materialsInserted: number;
  materialsUpdated: number;
  errors: number;
}

type CommitteeRow = {
  id: string;
  name: string;
  lrc_rsn: number;
  committee_type: string;
};

async function fetchCommitteeMaterials(rsn: number): Promise<{
  html: string;
  url: string;
} | null> {
  const url = lrcCommitteeDocumentsUrl(rsn);
  try {
    const res = await axios.get<string>(url, {
      timeout: 30_000,
      responseType: 'text',
      headers: FETCH_HEADERS,
      validateStatus: (status) => status < 500, // 404 is "no materials yet"
    });
    if (res.status === 404 || !res.data) return null;
    return { html: res.data, url };
  } catch (e) {
    logError(`fetch failed for rsn=${rsn}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

async function resolveMeetingIdByDate(
  supabase: SupabaseClient,
  committeeId: string,
  meetingDate: string | null,
): Promise<string | null> {
  if (!meetingDate) return null;
  const { data } = await supabase
    .from('ky_committee_meetings')
    .select('id')
    .eq('committee_id', committeeId)
    .eq('meeting_date', meetingDate)
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function upsertMaterialsForCommittee(
  supabase: SupabaseClient,
  committee: CommitteeRow,
  parsed: LrcCommitteeMaterialsParseResult,
  sourceUrl: string,
  dryRun: boolean,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const meeting of parsed.meetings) {
    const meetingId = await resolveMeetingIdByDate(supabase, committee.id, meeting.meetingDate);

    for (let i = 0; i < meeting.materials.length; i++) {
      const mat = meeting.materials[i]!;

      if (dryRun) {
        inserted++;
        continue;
      }

      const { data: existing } = await supabase
        .from('ky_committee_materials')
        .select('id')
        .eq('committee_id', committee.id)
        .eq('url', mat.url)
        .maybeSingle<{ id: string }>();

      const row = {
        committee_id: committee.id,
        meeting_id: meetingId,
        meeting_date: meeting.meetingDate,
        date_label: meeting.dateLabel,
        title: mat.title,
        url: mat.url,
        file_type: mat.fileType,
        source_url: sourceUrl,
        sort_order: i,
        scraped_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await supabase
          .from('ky_committee_materials')
          .update(row)
          .eq('id', existing.id);
        if (error) {
          logError(`update failed for committee=${committee.id} url=${mat.url}: ${error.message}`);
          continue;
        }
        updated++;
      } else {
        const { error } = await supabase
          .from('ky_committee_materials')
          .insert(row);
        if (error) {
          logError(`insert failed for committee=${committee.id} url=${mat.url}: ${error.message}`);
          continue;
        }
        inserted++;
      }
    }
  }

  return { inserted, updated };
}

export async function syncKyLrcCommitteeMaterials(
  supabase: SupabaseClient,
  options: KyLrcCommitteeMaterialsSyncOptions = {},
): Promise<KyLrcCommitteeMaterialsSyncStats> {
  const stats: KyLrcCommitteeMaterialsSyncStats = {
    committeesProcessed: 0,
    committeesWithMaterials: 0,
    materialsInserted: 0,
    materialsUpdated: 0,
    errors: 0,
  };

  let query = supabase
    .from('ky_committees')
    .select('id, name, lrc_rsn, committee_type')
    .not('lrc_rsn', 'is', null)
    .order('name', { ascending: true });

  if (options.committeeIds?.length) {
    query = query.in('id', options.committeeIds);
  }
  if (options.committeeTypes?.length) {
    query = query.in('committee_type', options.committeeTypes);
  }
  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data: committees, error } = await query;
  if (error) {
    logError(`failed to list committees: ${error.message}`);
    stats.errors++;
    return stats;
  }

  const rows = (committees ?? []) as CommitteeRow[];
  log(`scanning ${rows.length} committee(s)…${options.dryRun ? ' [dry-run]' : ''}`);

  for (const committee of rows) {
    stats.committeesProcessed++;
    const fetched = await fetchCommitteeMaterials(committee.lrc_rsn);
    if (!fetched) {
      log(`[${committee.name}] no materials page (404 or fetch error)`);
      if (options.delayMs && options.delayMs > 0) {
        await new Promise((r) => setTimeout(r, options.delayMs));
      }
      continue;
    }
    const parsed = parseCommitteeMaterialsHtml(fetched.html, fetched.url);
    if (parsed.meetings.length === 0) {
      log(`[${committee.name}] page parsed but 0 meetings with materials`);
    } else {
      stats.committeesWithMaterials++;
      const { inserted, updated } = await upsertMaterialsForCommittee(
        supabase,
        committee,
        parsed,
        fetched.url,
        Boolean(options.dryRun),
      );
      stats.materialsInserted += inserted;
      stats.materialsUpdated += updated;
      log(
        `[${committee.name}] ${parsed.stats.meetingCount} meeting(s), ` +
          `${inserted} inserted, ${updated} updated` +
          (options.dryRun ? ' [dry-run]' : ''),
      );
    }

    if (options.delayMs && options.delayMs > 0) {
      await new Promise((r) => setTimeout(r, options.delayMs));
    }
  }

  log(
    `done — committees=${stats.committeesProcessed} withMaterials=${stats.committeesWithMaterials} ` +
      `inserted=${stats.materialsInserted} updated=${stats.materialsUpdated} errors=${stats.errors}`,
  );

  return stats;
}
