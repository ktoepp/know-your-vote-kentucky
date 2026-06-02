import {
  getActiveSession,
  getInterimPeriod,
  getSessionPhase,
  KY_SESSIONS,
  type KYSessionPhase,
} from '@/lib/ky-sessions';
import { formatCivicDate } from '@/lib/civic-date';

export type SessionBannerModel = {
  /** Primary headline, e.g. "2026 Regular Session" or "2026 Interim". */
  sessionName: string;
  /** Date range under the headline. May be open-ended ("April 16, 2026 – TBD") in interim. */
  dateRange: string;
  /** Current legislative-cycle phase. */
  phase: KYSessionPhase | 'interim';
  /** Optional second-line context — e.g. interim-committee note, veto-recess explanation. */
  contextLine?: string;
  /** Show the standing "check LRC for posted meetings" tail link. */
  showLrcLink: boolean;
};

function fmtDate(d: string): string {
  return formatCivicDate(d) ?? d;
}

/** Pure session banner copy for server or client render. */
export function getSessionBannerModel(asOf: Date = new Date()): SessionBannerModel {
  const active = getActiveSession(asOf);
  const phase = getSessionPhase(asOf);

  if (active) {
    const sessionName = active.name;
    const dateRange = `${fmtDate(active.start)} – ${fmtDate(active.end)}`;
    if (phase === 'veto_recess' && active.milestones?.vetoRecessStart && active.milestones.vetoRecessEnd) {
      return {
        sessionName,
        dateRange,
        phase,
        contextLine:
          `Veto recess: ${fmtDate(active.milestones.vetoRecessStart)} – ${fmtDate(active.milestones.vetoRecessEnd)}. ` +
          'The Governor has up to 10 days to act on enrolled bills before chambers reconvene to consider overrides.',
        showLrcLink: true,
      };
    }
    if (phase === 'final_days') {
      return {
        sessionName,
        dateRange,
        phase,
        contextLine: 'Final days: chambers reconvene to consider veto overrides before sine die adjournment.',
        showLrcLink: true,
      };
    }
    return {
      sessionName,
      dateRange,
      phase,
      showLrcLink: false,
    };
  }

  const interim = getInterimPeriod(asOf);
  if (interim) {
    const endLabel = interim.end ? fmtDate(interim.end) : 'next session convenes';
    return {
      sessionName: interim.name,
      dateRange: `${fmtDate(interim.start)} – ${endLabel}`,
      phase: 'interim',
      contextLine:
        'Between regular sessions. Interim joint committees meet to study issues and pre-file bills for the next session.',
      showLrcLink: true,
    };
  }

  // Fallback (no active session, no derivable interim) — show the most recent session label.
  const session = KY_SESSIONS[0]!;
  return {
    sessionName: session.name,
    dateRange: `${fmtDate(session.start)} – ${fmtDate(session.end)}`,
    phase: 'interim',
    showLrcLink: true,
  };
}
