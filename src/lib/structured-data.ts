import type { KYBill, KYLegislator, KYCommittee } from '@/types/kentucky';
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
