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
import { TooltipProvider } from '@/lib/TooltipContext';
import { UserProvider } from "./lib/UserContext";
import { publicSiteOrigin } from '@/lib/site-canonical';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildSiteJsonLd } from '@/lib/structured-data';

const siteOrigin = publicSiteOrigin();

export const metadata: Metadata = {
  title: 'Know Your Vote Kentucky',
  description: 'Track Kentucky legislation, representatives, and civic engagement',
  keywords: "Kentucky legislation, civic engagement, democracy, public affairs, bill tracking, Kentucky representatives",
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
  openGraph: {
    title: "Know Your Vote Kentucky - Track Kentucky Legislation",
    description: "Track Kentucky legislation, representatives, and civic engagement. Making government accessible through AI.",
    url: siteOrigin,
    siteName: "Know Your Vote Kentucky",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Know Your Vote Kentucky - Track Kentucky Legislation",
    description: "Track Kentucky legislation, representatives, and civic engagement. Making government accessible through AI.",
  },
  alternates: {
    canonical: siteOrigin,
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
