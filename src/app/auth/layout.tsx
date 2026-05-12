/**
 * Centers auth forms in the main column (below the global nav) without stacking an extra
 * full-viewport wrapper — avoids double scroll and off-center cards.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:py-10">
      {children}
    </div>
  );
}
