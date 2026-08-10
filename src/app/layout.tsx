import React, { Suspense } from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import ClientThemeProvider from './components/ClientThemeProvider';
import PostHogPageviewTracker from './components/PostHogPageviewTracker';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans',
  display: 'swap',
});
import Navigation from "./components/Navigation";
import SiteFooter from "./components/SiteFooter";
import TopProgressBar from "./components/TopProgressBar";
import { TooltipProvider } from '@/lib/TooltipContext';
import { UserProvider } from "./lib/UserContext";
import { publicSiteOrigin } from '@/lib/site-canonical';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildSiteJsonLd } from '@/lib/structured-data';

const siteOrigin = publicSiteOrigin();

// No layout-level `alternates` here: it would be inherited by every page that
// doesn't set its own, making browse/static pages declare the homepage as their
// canonical. Each indexable page sets a self-referencing canonical via
// `buildPageMetadata` (src/lib/seo.ts); `metadataBase` absolutizes those paths.
export const metadata: Metadata = {
  title: {
    default: 'Know Your Vote Kentucky — Kentucky bill tracking and legislator lookup',
    template: '%s | Know Your Vote Kentucky',
  },
  description:
    'Track Kentucky General Assembly bills, look up your state legislators, and receive email updates when legislation moves.',
  authors: [{ name: "Know Your Vote Kentucky Team" }],
  creator: "Know Your Vote Kentucky",
  publisher: "Know Your Vote Kentucky",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteOrigin),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48 64x64' },
      { url: '/branding/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/branding/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/branding/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    siteName: "Know Your Vote Kentucky",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  verification: {
    google: "fQMQMUDeDWtfRZTik5SInNXWP6a9OWx99aRPY_V6iCM",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="anonymous" />
        {/* PostHog init runs from instrumentation-client.ts; PSI estimates a 360ms
            LCP win from a preconnect since the assets host and the ingest host
            differ. Both origins are pinged before scripts arrive. */}
        <link rel="preconnect" href="https://us-assets.i.posthog.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
        {/* Typekit (aesthet-nova headings) loaded non-blocking: it cost ~870ms
            of render-block on throttled mobile. The preload starts the fetch at
            head-parse; the inline script attaches the stylesheet without
            blocking first paint. Headings fall back Georgia -> aesthet-nova
            for the brief load window (see theme.ts font stack). */}
        <link rel="preload" href="https://use.typekit.net/yru3sto.css" as="style" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://use.typekit.net/yru3sto.css';document.head.appendChild(l);})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href="https://use.typekit.net/yru3sto.css" />
        </noscript>
        <JsonLd data={buildSiteJsonLd()} />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <Suspense fallback={null}>
          <PostHogPageviewTracker />
        </Suspense>
        <UserProvider>
          <ClientThemeProvider>
            <TooltipProvider>
              <Navigation />
              <main
                id="main-content"
                className="pt-0 flex min-h-0 flex-1 flex-col"
                aria-label="Main content"
              >
                {children}
              </main>
              <SiteFooter />
            </TooltipProvider>
          </ClientThemeProvider>
        </UserProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
