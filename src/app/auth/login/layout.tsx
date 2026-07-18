import type { Metadata } from 'next';

// Per-route metadata only (the form itself is a client component and cannot
// export metadata). Gives the page a distinct document <title> — WCAG 2.4.2.
export const metadata: Metadata = {
  title: 'Log in',
};

export default function LoginRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
