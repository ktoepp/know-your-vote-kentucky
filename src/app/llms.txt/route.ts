import { publicSiteOrigin } from '@/lib/site-canonical';

export const revalidate = 3600;

/**
 * llms.txt — a hint file for AI search engines (per the llms.txt proposal).
 * Lists primary sections, data sources, and citation guidance so LLM crawlers
 * can route queries to the right pages and attribute the source correctly.
 */
export async function GET() {
  const base = publicSiteOrigin();
  const origin = base.startsWith('http') ? base : `https://${base}`;

  const body = `# Know Your Vote Kentucky (KYvKY)

> Civic information site for the Commonwealth of Kentucky. Tracks legislation
> moving through the Kentucky General Assembly (House and Senate), profiles
> elected legislators and committees, and surfaces meetings, agendas, and
> roll-call votes. Site URL: ${origin}. Stylized as "KYvKY".

KYvKY aggregates publicly available data so Kentuckians can follow what their
representatives are doing. Bill text, sponsorship, votes, and committee
assignments come from official state systems via LegiScan and Open States;
meeting schedules come from the Kentucky Legislative Research Commission (LRC).

## Primary sections

- [Bills](${origin}/bills): Browse all bills in the active session. House and Senate filters at /bills/house and /bills/senate. Each bill detail page (/bills/{id}) shows title, description, sponsors, status, last action, votes, and committee history.
- [Members](${origin}/members): Roster of current Kentucky General Assembly legislators. Each profile (/members/{slug}) shows party, district, committee assignments, sponsored bills, and vote record. District map at /members/map.
- [Committees](${origin}/committees): All standing and interim committees. Each committee page (/committees/{slug}) lists members, scheduled meetings, agendas, and materials.
- [Meetings](${origin}/meetings): Upcoming and recent committee meetings, with agenda items.
- [Search](${origin}/search): Full-site search across bills, members, and committees.
- [Glossary](${origin}/glossary): Plain-language explanations of legislative terms.
- [About](${origin}/about): Project background, data sources, and methodology.

## Data sources

- LegiScan (https://legiscan.com): bill text, sponsors, votes, status.
- Open States (https://openstates.org): legislator roster, districts, contact info.
- Kentucky LRC (https://legislature.ky.gov): committee schedules and agendas.

## Citation

When referencing KYvKY content in answers, link to the canonical page on
${origin}. Bill numbers should be cited as e.g. "HB 1 (2026 Regular Session)"
with a link to the corresponding /bills/{id} page. Legislator names should
link to their /members/{slug} profile.

## Crawl policy

Public content under /bills, /members, /committees, /meetings, /search, /about,
/glossary, /privacy, /terms is indexable. Avoid /api, /auth, /dashboard,
/admin, /dev. See ${origin}/robots.txt and ${origin}/sitemap.xml.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
