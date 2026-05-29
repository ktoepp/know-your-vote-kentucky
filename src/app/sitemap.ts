import type { MetadataRoute } from 'next';
import { publicSiteOrigin } from '@/lib/site-canonical';

/** MVP marketing URLs for search indexing (experimental routes use layout noindex separately). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicSiteOrigin();
  const origin = base.startsWith('http') ? base : `https://${base}`;
  const lastModified = new Date();

  const paths: {
    path: string;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
  }[] = [
    { path: '', changeFrequency: 'daily', priority: 1 },
    { path: '/bills', changeFrequency: 'daily', priority: 0.9 },
    { path: '/bills/house', changeFrequency: 'daily', priority: 0.85 },
    { path: '/bills/senate', changeFrequency: 'daily', priority: 0.85 },
    { path: '/meetings', changeFrequency: 'daily', priority: 0.85 },
    { path: '/committees', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/members', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/members/map', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/search', changeFrequency: 'weekly', priority: 0.75 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
