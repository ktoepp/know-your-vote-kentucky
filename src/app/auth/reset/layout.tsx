import type { Metadata } from 'next';

// Per-route metadata only (the form itself is a client component and cannot
// export metadata). Gives the page a distinct document <title> — WCAG 2.4.2.
export const metadata: Metadata = {
  title: 'Reset password',
};

export default function ResetRouteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
