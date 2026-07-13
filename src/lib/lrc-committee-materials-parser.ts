/**
 * Parse LRC Committee Documents HTML
 * (apps.legislature.ky.gov/CommitteeDocuments/{rsn}).
 *
 * Page structure observed (fixtures/lrc/committee-materials-itoc-live.html):
 *
 *   <h1>{Committee Name}</h1>
 *   <h2>Meeting Materials</h2>
 *     <h3>{Day, Month D, YYYY}</h3>
 *     <ul>
 *       <li><a href="./{folder}/{filename}.pdf">{filename}.pdf</a></li>
 *       …
 *     </ul>
 *     <h3>{Other meeting date}</h3>
 *     <ul>…</ul>
 *     …
 *     <h3>Other Meeting Years</h3>
 *     <ul>
 *       <li><a href="./{year}.html">{year}</a></li>
 *     </ul>
 *
 * Each meeting group is the `<ul>` that immediately follows an `<h3>`.
 * "Other Meeting Years" is recognized and excluded from materials output;
 * its links are exposed separately for backfill via prior-year pages.
 */
import * as cheerio from 'cheerio';

export interface LrcCommitteeMaterial {
  /** Display name (file basename or human-readable label from the `<a>` text). */
  title: string;
  /** Absolute URL to the file. */
  url: string;
  /** Lowercase extension without the dot (`pdf`, `docx`, etc.); `null` for non-file links. */
  fileType: string | null;
}

export interface LrcCommitteeMaterialsMeeting {
  /** Date label as printed (e.g. "Thursday, May 21, 2026"). */
  dateLabel: string;
  /** Parsed ISO date (YYYY-MM-DD) when parseable. */
  meetingDate: string | null;
  materials: LrcCommitteeMaterial[];
}

export interface LrcCommitteeMaterialsParseResult {
  committeeName: string | null;
  meetings: LrcCommitteeMaterialsMeeting[];
  /** Links to prior-year pages (`/CommitteeDocuments/{rsn}/{year}.html`). */
  priorYearUrls: string[];
  stats: {
    meetingCount: number;
    materialCount: number;
  };
}

const PAGE_BASE = 'https://apps.legislature.ky.gov';

function resolveUrl(href: string, sourceUrl: string): string {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return href;
  }
}

function inferFileType(url: string): string | null {
  const m = url.toLowerCase().match(/\.([a-z0-9]{2,5})(?:[?#]|$)/);
  if (!m) return null;
  const ext = m[1]!;
  // Filter out obviously-not-a-document extensions (html year-pages, etc.)
  if (ext === 'html' || ext === 'htm' || ext === 'aspx') return null;
  return ext;
}

function parseDateLabel(label: string): string | null {
  // "Thursday, May 21, 2026" → "2026-05-21"
  const m = label.match(/(\w+),\s+(\w+)\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const [, , monthName, day, year] = m;
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
  };
  const mm = months[monthName!.toLowerCase()];
  if (!mm) return null;
  return `${year}-${mm}-${day!.padStart(2, '0')}`;
}

/**
 * @param html HTML body of the CommitteeDocuments page.
 * @param sourceUrl Absolute URL used to resolve relative material `href`s.
 *                  Defaults to the apps.legislature.ky.gov apex; callers
 *                  should pass the actual page URL when known.
 */
export function parseCommitteeMaterialsHtml(
  html: string,
  sourceUrl: string = PAGE_BASE,
): LrcCommitteeMaterialsParseResult {
  const $ = cheerio.load(html);

  const meetings: LrcCommitteeMaterialsMeeting[] = [];
  const priorYearUrls: string[] = [];

  // Find the "Meeting Materials" section's <h2>, then walk its sibling <h3>/<ul> pairs.
  const materialsHeader = $('h2')
    .filter((_, el) => $(el).text().trim().toLowerCase() === 'meeting materials')
    .first();

  // Pick the committee name from the <h1> nearest the Meeting Materials section
  // (the LRC page banner uses an <h1 class="header-title-description"> too).
  let committeeName: string | null = null;
  if (materialsHeader.length > 0) {
    const parent = materialsHeader.parent();
    const localH1 = parent.find('h1').first();
    if (localH1.length > 0) {
      committeeName = localH1.text().trim() || null;
    }
  }
  if (!committeeName) {
    committeeName = $('h1').not('.header-title-description').first().text().trim() || null;
  }

  if (materialsHeader.length === 0) {
    return {
      committeeName,
      meetings: [],
      priorYearUrls: [],
      stats: { meetingCount: 0, materialCount: 0 },
    };
  }

  // The LRC page wraps the per-meeting <h3>/<ul> pairs inside a sibling <div>
  // after the <h2>Meeting Materials</h2>. Walk that container's children;
  // fall back to the h2's own siblings if the structure ever flattens.
  const $sibDiv = materialsHeader.nextAll('div').first();
  const groupChildren = $sibDiv.length > 0 ? $sibDiv.children() : materialsHeader.nextAll();
  const siblings = groupChildren;
  for (let i = 0; i < siblings.length; i++) {
    const $node = siblings.eq(i);
    const tag = ($node[0] as { name?: string } | undefined)?.name ?? '';

    if (tag === 'h2') break; // next section
    if (tag !== 'h3') continue;

    const heading = $node.text().trim();

    // The associated <ul> is the next element sibling (skip whitespace).
    let listIdx = i + 1;
    while (listIdx < siblings.length) {
      const t = (siblings[listIdx] as { name?: string } | undefined)?.name ?? '';
      if (t === 'ul') break;
      // Another heading without a list (rare) — stop scanning for this h3.
      if (t === 'h2' || t === 'h3') { listIdx = -1; break; }
      listIdx++;
    }
    if (listIdx === -1 || listIdx >= siblings.length) continue;
    const $list = siblings.eq(listIdx);

    if (heading.toLowerCase() === 'other meeting years') {
      $list.find('a[href]').each((_, a) => {
        const href = $(a).attr('href');
        if (href) priorYearUrls.push(resolveUrl(href, sourceUrl));
      });
      continue;
    }

    const materials: LrcCommitteeMaterial[] = [];
    $list.find('a[href]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href');
      if (!href) return;
      const title = $a.text().trim();
      if (!title) return;
      const absolute = resolveUrl(href, sourceUrl);
      materials.push({
        title,
        url: absolute,
        fileType: inferFileType(absolute),
      });
    });

    if (materials.length > 0) {
      meetings.push({
        dateLabel: heading,
        meetingDate: parseDateLabel(heading),
        materials,
      });
    }
  }

  return {
    committeeName,
    meetings,
    priorYearUrls,
    stats: {
      meetingCount: meetings.length,
      materialCount: meetings.reduce((n, m) => n + m.materials.length, 0),
    },
  };
}

export const LRC_COMMITTEE_DOCUMENTS_BASE_URL =
  'https://apps.legislature.ky.gov/CommitteeDocuments';

export function lrcCommitteeDocumentsUrl(rsn: number): string {
  // Trailing slash is load-bearing: LRC nests each meeting folder under the
  // committee-RSN directory (e.g. /CommitteeDocuments/13/44515/…), and the
  // page's hrefs are relative (./44515/…). Without the slash, `new URL()`
  // treats `/{rsn}` as a filename and drops it, producing the old flat
  // /CommitteeDocuments/{meeting_id}/… URLs that started returning 404 when
  // LRC migrated the layout.
  return `${LRC_COMMITTEE_DOCUMENTS_BASE_URL}/${rsn}/`;
}
