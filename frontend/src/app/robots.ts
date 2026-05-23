import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/activity',
          '/activity/',
          '/analytics',
          '/analytics/',
          '/issues',
          '/issues/',
          '/repositories',
          '/repositories/',
          '/trends',
          '/trends/',
          '/settings',
          '/settings/',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
