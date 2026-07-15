/**
 * Parse LRC Weekly Legislative Calendar HTML (apps.legislature.ky.gov/legislativecalendar).
 * Phase 0 spike — see docs/specs/committee-calendar-phase0-report.md
 */
import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import { extractLrcBillReferences, type LrcBillReference } from './lrc-bill-reference-parser';

export interface LrcCalendarCommitteeRef {
  name: string;
  profileUrl: string | null;
  lrcRsn: number | null;
  committeeType: string | null;
}

export interface LrcCalendarMemberRef {
  displayName: string;
  profileUrl: string | null;
  districtNumber: number | null;
}

export interface LrcCalendarAgendaItem {
  rawText: string;
  /**
   * Nesting depth (0 = top-level). LRC agenda blocks use one leading TAB
   * per indent level, so counting leading tabs on each split line recovers
   * the source hierarchy that .text() collapses away.
   */
  depth: number;
  billReferences: LrcBillReference[];
}

export interface LrcCalendarMeeting {
  meetingDate: string;
  dateLabel: string;
  timeAndLocation: string | null;
  committee: LrcCalendarCommitteeRef;
  members: LrcCalendarMemberRef[];
  agendaItems: LrcCalendarAgendaItem[];
  status: 'scheduled' | 'no_meeting';
}

export interface LrcCalendarDay {
  dateLabel: string;
  meetingDate: string | null;
  meetings: LrcCalendarMeeting[];
}

export interface LrcLegislativeCalendarParseResult {
  source: 'legislative-calendar';
  fetchedAt: string | null;
  days: LrcCalendarDay[];
  stats: {
    dayCount: number;
    meetingCount: number;
    agendaItemCount: number;
    billReferenceCount: number;
  };
}

const NO_MEETINGS = /no\s+meetings\s+scheduled/i;

function parseCommitteeDetailsUrl(href: string | undefined): Pick<LrcCalendarCommitteeRef, 'lrcRsn' | 'committeeType' | 'profileUrl'> {
  if (!href) return { lrcRsn: null, committeeType: null, profileUrl: null };
  try {
    const url = new URL(href, 'https://legislature.ky.gov');
    const rsn = url.searchParams.get('CommitteeRSN');
    const committeeType = url.searchParams.get('CommitteeType');
    return {
      profileUrl: url.href,
      lrcRsn: rsn ? parseInt(rsn, 10) : null,
      committeeType: committeeType?.trim() || null,
    };
  } catch {
    return { lrcRsn: null, committeeType: null, profileUrl: href };
  }
}

/** "Monday, May 18, 2026" → ISO date in local calendar sense (UTC noon to avoid TZ drift). */
export function parseLrcCalendarDateLabel(label: string): string | null {
  const cleaned = label.replace(/\s+/g, ' ').trim();
  const d = new Date(`${cleaned} 12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseMembers($: cheerio.CheerioAPI, $members: cheerio.Cheerio<Element>): LrcCalendarMemberRef[] {
  const out: LrcCalendarMemberRef[] = [];
  $members.find('a[href*="Legislator-Profile"]').each((_, a) => {
    const $a = $(a);
    const href = $a.attr('href');
    let districtNumber: number | null = null;
    if (href) {
      try {
        const dn = new URL(href, 'https://legislature.ky.gov').searchParams.get('DistrictNumber');
        districtNumber = dn ? parseInt(dn, 10) : null;
      } catch {
        districtNumber = null;
      }
    }
    out.push({
      displayName: $a.text().replace(/\s+/g, ' ').trim(),
      profileUrl: href ? new URL(href, 'https://legislature.ky.gov').href : null,
      districtNumber,
    });
  });
  return out;
}

interface AgendaSourceLine {
  text: string;
  depth: number;
}

/**
 * Split the agenda block preserving depth: LRC uses one leading TAB per
 * indent level (visible in the raw HTML — see fixtures/lrc/*.html). Count
 * tabs before collapsing whitespace so the source hierarchy survives.
 */
function splitAgendaLines(agendaText: string): AgendaSourceLine[] {
  return agendaText
    .split(/\n+/)
    .map((raw): AgendaSourceLine | null => {
      const tabMatch = raw.match(/^\t+/);
      const depth = tabMatch ? tabMatch[0].length : 0;
      const text = raw.replace(/^\t+/, '').replace(/\s+/g, ' ').trim();
      return text.length > 0 ? { text, depth } : null;
    })
    .filter((line): line is AgendaSourceLine => line !== null);
}

function parseAgendaBlock($agenda: cheerio.Cheerio<Element>): LrcCalendarAgendaItem[] {
  // Trim only around the outer "Agenda:" prefix — keep in-line whitespace so
  // splitAgendaLines can read leading tabs on each line.
  const full = $agenda.text().replace(/^\s*Agenda:\s*/i, '').replace(/\s+$/, '');
  if (!full) return [];
  return splitAgendaLines(full).map(({ text, depth }) => ({
    rawText: text,
    depth,
    billReferences: extractLrcBillReferences(text),
  }));
}

function parseMeetingFromNodes(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  meetingDate: string,
  dateLabel: string,
): LrcCalendarMeeting | null {
  let timeAndLocation: string | null = null;
  let committee: LrcCalendarCommitteeRef | null = null;
  let members: LrcCalendarMemberRef[] = [];
  let agendaItems: LrcCalendarAgendaItem[] = [];

  for (const node of nodes) {
    if (node.type !== 'tag') continue;
    const el = node as Element;
    const $el = $(el);
    const cls = el.attribs?.class ?? '';

    if (cls.includes('TimeAndLocation')) {
      timeAndLocation = $el.text().replace(/\s+/g, ' ').trim() || null;
    } else if (cls.includes('CommitteeName')) {
      const text = $el.text().replace(/\s+/g, ' ').trim();
      if (NO_MEETINGS.test(text)) {
        return {
          meetingDate,
          dateLabel,
          timeAndLocation: null,
          committee: { name: text, profileUrl: null, lrcRsn: null, committeeType: null },
          members: [],
          agendaItems: [],
          status: 'no_meeting',
        };
      }
      const $link = $el.find('a').first();
      const href = $link.attr('href');
      const details = parseCommitteeDetailsUrl(href);
      committee = {
        name: ($link.text() || text).replace(/\s+/g, ' ').trim(),
        ...details,
      };
    } else if (cls.includes('Members')) {
      members = parseMembers($, $el);
    } else if (cls.includes('Agenda')) {
      agendaItems = parseAgendaBlock($el);
    }
  }

  if (!committee) return null;
  if (committee && NO_MEETINGS.test(committee.name)) {
    return {
      meetingDate,
      dateLabel,
      timeAndLocation: null,
      committee,
      members: [],
      agendaItems: [],
      status: 'no_meeting',
    };
  }

  return {
    meetingDate,
    dateLabel,
    timeAndLocation,
    committee,
    members,
    agendaItems,
    status: 'scheduled',
  };
}

/**
 * Parse full legislative calendar HTML into structured days/meetings.
 */
export function parseLegislativeCalendarHtml(html: string): LrcLegislativeCalendarParseResult {
  const $ = cheerio.load(html);
  const panel = $('.panel.style1').first();
  const root = panel.length ? panel : $('body');

  const days: LrcCalendarDay[] = [];

  root.find('.DateHeading').each((_, heading) => {
    const $heading = $(heading);
    const dateLabel = $heading.text().replace(/\s+/g, ' ').trim();
    const meetingDate = parseLrcCalendarDateLabel(dateLabel);

    const blockNodes = $heading.nextUntil('.DateHeading').toArray();
    const meetings: LrcCalendarMeeting[] = [];

    if (!meetingDate) {
      days.push({ dateLabel, meetingDate: null, meetings });
      return;
    }

    const segments: { start: number; nodes: AnyNode[] }[] = [];
    let current: AnyNode[] = [];

    for (const node of blockNodes) {
      if (node.type !== 'tag') continue;
      const cls = (node as Element).attribs?.class ?? '';
      if (cls.includes('TimeAndLocation') && current.length > 0) {
        segments.push({ start: segments.length, nodes: current });
        current = [node];
      } else {
        current.push(node);
      }
    }
    if (current.length > 0) segments.push({ start: segments.length, nodes: current });

    if (segments.length === 0) {
      const m = parseMeetingFromNodes($, blockNodes, meetingDate, dateLabel);
      if (m) meetings.push(m);
    } else {
      for (const seg of segments) {
        const m = parseMeetingFromNodes($, seg.nodes, meetingDate, dateLabel);
        if (m) meetings.push(m);
      }
    }

    days.push({ dateLabel, meetingDate, meetings });
  });

  let meetingCount = 0;
  let agendaItemCount = 0;
  let billReferenceCount = 0;
  for (const day of days) {
    for (const mtg of day.meetings) {
      if (mtg.status === 'scheduled') meetingCount++;
      agendaItemCount += mtg.agendaItems.length;
      for (const item of mtg.agendaItems) {
        billReferenceCount += item.billReferences.length;
      }
    }
  }

  return {
    source: 'legislative-calendar',
    fetchedAt: null,
    days,
    stats: {
      dayCount: days.length,
      meetingCount,
      agendaItemCount,
      billReferenceCount,
    },
  };
}
