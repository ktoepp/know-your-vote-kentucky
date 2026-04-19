import type { MetadataRoute } from 'next';

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/\/$/, '') ||
    'https://knowyourvotekentucky.org'
  );
}

/** Public crawl rules + sitemap hint. API, auth, and placeholder dashboard stay out of search. */
export default function robots(): MetadataRoute.Robots {
  const base = siteBase();
  const origin = base.startsWith('http') ? base : `https://${base}`;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/dashboard'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
