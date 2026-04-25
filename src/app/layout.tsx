import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import ClientThemeProvider from './components/ClientThemeProvider';
import Navigation from "./components/Navigation";
import SiteFooter from "./components/SiteFooter";
import { TooltipProvider } from '@/lib/TooltipContext';
import { UserProvider } from "./lib/UserContext";
import ContrastTester from '../components/dev/ContrastTester';

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
  metadataBase: new URL("https://knowyourvotekentucky.org"),
  openGraph: {
    title: "Know Your Vote Kentucky - Track Kentucky Legislation",
    description: "Track Kentucky legislation, representatives, and civic engagement. Making government accessible through AI.",
    url: "https://knowyourvotekentucky.org",
    siteName: "Know Your Vote Kentucky",
    images: [
      {
        url: "https://knowyourvotekentucky.org/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Know Your Vote Kentucky",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Know Your Vote Kentucky - Track Kentucky Legislation",
    description: "Track Kentucky legislation, representatives, and civic engagement. Making government accessible through AI.",
    images: ["https://knowyourvotekentucky.org/og-image.jpg"],
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
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Always use light mode
              (function() {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
              })()
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <UserProvider>
          <ClientThemeProvider>
            <TooltipProvider>
              <Navigation />
              <main id="main-content" className="pt-0 flex min-h-0 flex-1 flex-col">
                {children}
              </main>
              <SiteFooter />
              <ContrastTester />
            </TooltipProvider>
          </ClientThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}
