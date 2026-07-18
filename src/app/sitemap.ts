import type { MetadataRoute } from 'next';
import { publicSiteOrigin } from '@/lib/site-canonical';
import {
  fetchBillSitemapEntries,
  fetchCommitteeSitemapEntries,
  fetchMemberSitemapEntries,
} from '@/lib/sitemap-data';

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

export const revalidate = 3600;

/** Static + dynamic URLs for search indexing. Experimental routes use layout noindex separately. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteOrigin();
  const origin = base.startsWith('http') ? base : `https://${base}`;

  const staticPaths: { path: string; changeFrequency: ChangeFreq; priority: number }[] = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/bills', changeFrequency: 'daily', priority: 0.9 },
    { path: '/bills/house', changeFrequency: 'daily', priority: 0.85 },
    { path: '/bills/senate', changeFrequency: 'daily', priority: 0.85 },
    { path: '/meetings', changeFrequency: 'daily', priority: 0.85 },
    { path: '/committees', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/members', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/members/map', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/search', changeFrequency: 'weekly', priority: 0.75 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/glossary', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/legislature/resources', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const [bills, members, committees] = await Promise.all([
    fetchBillSitemapEntries().catch(() => []),
    fetchMemberSitemapEntries().catch(() => []),
    fetchCommitteeSitemapEntries().catch(() => []),
  ]);

  // `lastModified` is set only when a real content date exists — stamping "now" on
  // every regeneration tells crawlers everything changed hourly and erodes lastmod trust.
  const billEntries: MetadataRoute.Sitemap = bills.map((b) => ({
    url: `${origin}/bills/${encodeURIComponent(b.slug)}`,
    lastModified: b.lastModified,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const memberEntries: MetadataRoute.Sitemap = members.map((m) => ({
    url: `${origin}/members/${encodeURIComponent(m.slug)}`,
    lastModified: m.lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const committeeEntries: MetadataRoute.Sitemap = committees.map((c) => ({
    url: `${origin}/committees/${encodeURIComponent(c.slug)}`,
    lastModified: c.lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    changeFrequency,
    priority,
  }));

  return [...staticEntries, ...billEntries, ...memberEntries, ...committeeEntries];
}
