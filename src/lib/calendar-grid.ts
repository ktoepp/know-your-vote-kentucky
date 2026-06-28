/**
 * Month-grid math for the legislative calendar.
 *
 * All cells are anchored to UTC noon — the same convention as
 * {@link file://./civic-date.ts} and {@link file://./ky-sessions.ts} — so the ISO
 * day a cell reports is identical on the server and the client in any timezone
 * (avoids the React #418 hydration mismatch that `new Date("YYYY-MM-DD")` causes
 * in negative-offset locales).
 */
import { kyTodayIso } from '@/lib/ky-committee-display';

export interface CalendarDayCell {
  /** Calendar day as `YYYY-MM-DD`. */
  iso: string;
  /** Day-of-month number (1–31). */
  day: number;
  /** True when the cell belongs to the displayed month (vs. spillover). */
  inMonth: boolean;
  /** True when the cell is today (KY local date). */
  isToday: boolean;
}

/** Year + 0-based month index, the shape passed around the calendar UI. */
export interface CalendarMonth {
  year: number;
  /** 0 = January … 11 = December. */
  month: number;
}

const WEEKS = 6;
const DAYS_PER_WEEK = 7;

function atUtcNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12));
}

function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Build a fixed 6×7 month matrix (Sunday-start weeks). Leading/trailing cells
 * spill into the adjacent months and are flagged `inMonth: false`. The fixed
 * six-row height keeps the grid from reflowing as the user pages between months.
 */
export function buildMonthMatrix(year: number, month: number): CalendarDayCell[][] {
  const today = kyTodayIso();
  const firstWeekday = atUtcNoon(year, month, 1).getUTCDay(); // 0 = Sunday
  const weeks: CalendarDayCell[][] = [];

  for (let w = 0; w < WEEKS; w += 1) {
    const row: CalendarDayCell[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d += 1) {
      // `1 - firstWeekday + offset` lets Date.UTC roll over month/year bounds.
      const offset = w * DAYS_PER_WEEK + d;
      const date = atUtcNoon(year, month, 1 - firstWeekday + offset);
      const iso = isoOf(date);
      row.push({
        iso,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month,
        isToday: iso === today,
      });
    }
    weeks.push(row);
  }

  return weeks;
}

/** Shift a {year, month} by `delta` months, normalizing across year bounds. */
export function addMonths({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const base = atUtcNoon(year, month + delta, 1);
  return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
}

/** Human month label, e.g. "June 2026". */
export function monthLabel({ year, month }: CalendarMonth): string {
  return atUtcNoon(year, month, 1).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
}

/** The month containing today (KY local date). */
export function currentMonth(): CalendarMonth {
  const [y, m] = kyTodayIso().split('-');
  return { year: Number(y), month: Number(m) - 1 };
}

/** `YYYY-MM` for a month, used as the `?month=` URL value. */
export function formatMonthParam({ year, month }: CalendarMonth): string {
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
}

/** Parse a `YYYY-MM` param, falling back to the current month when absent/invalid. */
export function parseMonthParam(value: string | null | undefined): CalendarMonth {
  const m = /^(\d{4})-(\d{2})$/.exec((value ?? '').trim());
  if (!m) return currentMonth();
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return currentMonth();
  return { year, month: monthIndex };
}

/** True when two months refer to the same year+month. */
export function isSameMonth(a: CalendarMonth, b: CalendarMonth): boolean {
  return a.year === b.year && a.month === b.month;
}
