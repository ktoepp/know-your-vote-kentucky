import type { MetadataRoute } from 'next';
import { publicSiteOrigin } from '@/lib/site-canonical';

/** Public crawl rules + sitemap hint. API, auth, and placeholder dashboard stay out of search. */
export default function robots(): MetadataRoute.Robots {
  const base = publicSiteOrigin();
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
