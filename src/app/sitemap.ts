import type { MetadataRoute } from 'next';

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/\/$/, '') ||
    'https://knowyourvotekentucky.org'
  );
}

/** MVP marketing URLs for search indexing (experimental routes use layout noindex separately). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBase();
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
    { path: '/events', changeFrequency: 'daily', priority: 0.85 },
    { path: '/members', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/members/map', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/search', changeFrequency: 'weekly', priority: 0.75 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  ];

  return paths.map(({ path, changeFrequency, priority }) => ({
    url: `${origin}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
