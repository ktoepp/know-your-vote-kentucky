import { getActiveSession, KY_SESSIONS } from '@/lib/ky-sessions';

export type SessionBannerModel = {
  sessionName: string;
  dateRange: string;
  showAfterSessionNote: boolean;
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Pure session banner copy for server or client render. */
export function getSessionBannerModel(asOf: Date = new Date()): SessionBannerModel {
  const today = new Date(asOf);
  today.setHours(12, 0, 0, 0);

  const active = getActiveSession(asOf);
  const session = active ?? KY_SESSIONS[0]!;
  const isInSession = Boolean(active);
  const sessionEnd = new Date(session.end);
  sessionEnd.setHours(23, 59, 59, 999);
  const afterSession = today > sessionEnd && !isInSession;

  return {
    sessionName: session.name,
    dateRange: `${fmtDate(session.start)} – ${fmtDate(session.end)}`,
    showAfterSessionNote: afterSession,
  };
}
