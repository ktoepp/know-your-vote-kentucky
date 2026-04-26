'use client';

export interface InteractiveTermTooltipProps {
  children: React.ReactNode;
  term?: string;
  definition?: string;
}

/** Passthrough wrapper — federal tooltip terms have been removed (not applicable to KY General Assembly). */
export default function InteractiveTermTooltip({ children }: InteractiveTermTooltipProps) {
  return <>{children}</>;
}
