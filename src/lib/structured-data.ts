import type { KYBill, KYCommittee, KYCommitteeMeetingBrowse, KYLegislator } from '@/types/kentucky';
import { publicSiteOrigin } from '@/lib/site-canonical';
import { formatKyLegislatorDistrict } from '@/lib/bill-display';
import { kyMemberTitleShort, normalizeLegislatorPhotoUrl } from '@/lib/ky-member-utils';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

type JsonLdNode = Record<string, unknown>;

export interface BreadcrumbCrumb {
  name: string;
  path: string;
}

function absoluteUrl(path: string): string {
  const base = publicSiteOrigin();
  const origin = base.startsWith('http') ? base : `https://${base}`;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Site-wide Organization + WebSite (with search action) — emit once in the root layout. */
export function buildSiteJsonLd(): JsonLdNode {
  const origin = absoluteUrl('/');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}#organization`,
        name: 'Know Your Vote Kentucky',
        alternateName: 'KYvKY',
        url: origin,
        logo: absoluteUrl('/branding/Logo-03.png'),
        areaServed: { '@type': 'State', name: 'Kentucky' },
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}#website`,
        url: origin,
        name: 'Know Your Vote Kentucky',
        publisher: { '@id': `${origin}#organization` },
        inLanguage: 'en-US',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(crumbs: BreadcrumbCrumb[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** schema.org/Legislation for a Kentucky bill detail page. */
export function buildBillJsonLd(bill: KYBill, path: string): JsonLdNode {
  const description =
    bill.description?.trim() ||
    bill.ai_summary?.trim() ||
    `Kentucky ${bill.bill_number} — ${bill.title}`;
  const rawSponsors: unknown = bill.sponsors;
  const sponsors = (Array.isArray(rawSponsors) ? rawSponsors : [])
    .map((s) => (typeof s === 'string' ? s : (s as { name?: string })?.name))
    .filter((n): n is string => !!n && n.trim().length > 0);
  const legislationIdentifier = bill.bill_number?.replace(/\s+/g, '').toUpperCase();
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name: `${bill.bill_number} — ${bill.title}`,
    headline: bill.title,
    description: description.slice(0, 5000),
    url: absoluteUrl(path),
    legislationIdentifier,
    legislationJurisdiction: {
      '@type': 'AdministrativeArea',
      name: 'Kentucky',
    },
    legislationLegalForm: 'Bill',
    legislationDate: bill.introduced_date || undefined,
    dateModified: bill.last_action_date || bill.updated_at || undefined,
    inLanguage: 'en-US',
  };
  if (sponsors.length) {
    node.creator = sponsors.map((name) => ({ '@type': 'Person', name }));
  }
  if (bill.status) {
    node.creativeWorkStatus = bill.status;
  }
  return node;
}

/** schema.org/Person for a legislator profile page. */
export function buildLegislatorJsonLd(leg: KYLegislator, path: string): JsonLdNode {
  const role = kyMemberTitleShort(leg);
  const district = formatKyLegislatorDistrict(leg);
  const image =
    normalizeLegislatorPhotoUrl(leg.photo_url) ||
    normalizeLegislatorPhotoUrl(leg.legiscan_image_url) ||
    undefined;
  const sameAs: string[] = [];
  if (leg.ballotpedia) sameAs.push(leg.ballotpedia);
  const description = [role, district, 'Kentucky General Assembly'].filter(Boolean).join(' — ');
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: leg.name,
    givenName: leg.first_name || undefined,
    familyName: leg.last_name || undefined,
    jobTitle: role || 'Legislator',
    description,
    image,
    url: absoluteUrl(path),
    worksFor: {
      '@type': 'GovernmentOrganization',
      name: 'Kentucky General Assembly',
      areaServed: { '@type': 'State', name: 'Kentucky' },
    },
  };
  if (sameAs.length) node.sameAs = sameAs;
  if (leg.party) {
    node.memberOf = {
      '@type': 'PoliticalParty',
      name: leg.party === 'D' ? 'Democratic Party' : leg.party === 'R' ? 'Republican Party' : leg.party,
    };
  }
  return node;
}

/**
 * Parse the leading "H:MM am|pm ET …" from an LRC `time_and_location` string.
 * Returns null when the string doesn't carry a 12-hour clock time (e.g., cancelled
 * meetings whose fields devolve to bare "9:00 ET").
 */
function parseKyMeetingTimeAndLocation(
  timeAndLocation: string | null,
): { time: string; location: string | null } | null {
  if (!timeAndLocation) return null;
  const match = timeAndLocation.match(/^\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) return null;
  const hh = parseInt(match[1]!, 10);
  const mm = parseInt(match[2]!, 10);
  const meridiem = match[3]!.toLowerCase();
  if (hh < 1 || hh > 12 || mm < 0 || mm > 59) return null;
  const hour24 =
    meridiem === 'pm' ? (hh === 12 ? 12 : hh + 12) : hh === 12 ? 0 : hh;
  const time = `${String(hour24).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const commaIdx = timeAndLocation.indexOf(',');
  const location = commaIdx >= 0 ? timeAndLocation.slice(commaIdx + 1).trim() || null : null;
  return { time, location };
}

/** UTC offset for America/New_York on a given ISO date, e.g. "-04:00" (EDT) or "-05:00" (EST). */
function etOffsetForDate(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  return tz.replace(/^GMT/, '') || '-05:00';
}

/**
 * schema.org/Event for a Kentucky General Assembly committee meeting. Returns null
 * when the meeting has no attached committee (defensive — the join is server-side).
 */
export function buildMeetingEventJsonLd(meeting: KYCommitteeMeetingBrowse): JsonLdNode | null {
  const committee = meeting.ky_committees;
  if (!committee) return null;
  const committeeName = normalizeKyGaDisplayName(committee.name);
  const parsed = parseKyMeetingTimeAndLocation(meeting.time_and_location);
  const startDate = parsed
    ? `${meeting.meeting_date}T${parsed.time}${etOffsetForDate(meeting.meeting_date)}`
    : meeting.meeting_date;
  const url = absoluteUrl(
    `/committees/${encodeURIComponent(committee.slug)}#meeting-${meeting.id}`,
  );
  const node: JsonLdNode = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `${committeeName} meeting`,
    startDate,
    eventStatus:
      meeting.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    organizer: {
      '@type': 'GovernmentOrganization',
      name: committeeName,
      url: absoluteUrl(`/committees/${encodeURIComponent(committee.slug)}`),
    },
  };
  if (parsed?.location) {
    node.location = {
      '@type': 'Place',
      name: parsed.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Frankfort',
        addressRegion: 'KY',
        addressCountry: 'US',
      },
    };
  }
  return node;
}

export interface GlossaryFaqEntry {
  title: string;
  content: string;
}

/**
 * schema.org/FAQPage for the site glossary. Each entry becomes a Question whose
 * name is the term (as displayed on the page) and whose Answer text is the plain
 * definition — matches the visible on-page content per Google's structured-data
 * guidance.
 */
export function buildGlossaryFaqJsonLd(
  entries: GlossaryFaqEntry[],
  path: string,
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: absoluteUrl(path),
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.content,
      },
    })),
  };
}

/**
 * schema.org/AdministrativeArea for a legislative district page. schema.org has no
 * legislative-district type; AdministrativeArea contained in the State is the honest
 * fit. The member's Person node stays on the profile page — the HTML link carries
 * the relationship.
 */
export function buildDistrictJsonLd(name: string, path: string): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name,
    url: absoluteUrl(path),
    containedInPlace: { '@type': 'State', name: 'Kentucky' },
  };
}

/** schema.org/CollectionPage for index pages (districts, topics). */
export function buildCollectionPageJsonLd(opts: {
  name: string;
  description: string;
  path: string;
}): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    inLanguage: 'en-US',
  };
}

/** schema.org/GovernmentOrganization for a Kentucky General Assembly committee. */
export function buildCommitteeJsonLd(committee: KYCommittee, path: string): JsonLdNode {
  const name = normalizeKyGaDisplayName(committee.name);
  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name,
    url: absoluteUrl(path),
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: 'Kentucky General Assembly',
      areaServed: { '@type': 'State', name: 'Kentucky' },
    },
    areaServed: { '@type': 'State', name: 'Kentucky' },
  };
}
