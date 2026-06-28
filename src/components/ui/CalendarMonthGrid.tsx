'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, IconButton, Typography, type SxProps, type Theme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import {
  addMonths,
  buildMonthMatrix,
  currentMonth,
  isSameMonth,
  monthLabel,
  type CalendarDayCell,
  type CalendarMonth,
} from '@/lib/calendar-grid';
import { FOCUS_RING } from '@/lib/ui-tokens';

const WEEKDAYS = [
  { short: 'Sun', full: 'Sunday' },
  { short: 'Mon', full: 'Monday' },
  { short: 'Tue', full: 'Tuesday' },
  { short: 'Wed', full: 'Wednesday' },
  { short: 'Thu', full: 'Thursday' },
  { short: 'Fri', full: 'Friday' },
  { short: 'Sat', full: 'Saturday' },
] as const;

export interface CalendarMonthGridProps {
  /** Year + 0-based month currently displayed. */
  month: CalendarMonth;
  /** Currently selected day (`YYYY-MM-DD`), or null. */
  selectedIso: string | null;
  /** Called when the user activates a day (click / Enter / Space). */
  onSelectDay: (iso: string) => void;
  /** Called when the user pages to a different month (arrows / Today / PageUp-Down). */
  onMonthChange: (next: CalendarMonth) => void;
  /** Per-day decoration injected by the caller (dots, markers, etc.). */
  renderDay: (cell: CalendarDayCell) => React.ReactNode;
  /** Accessible label for a day button, e.g. "June 15, 2026 — 3 committee meetings". */
  dayAriaLabel: (cell: CalendarDayCell) => string;
  /** Accessible label for the whole grid (e.g. "Committee meeting calendar"). */
  gridAriaLabel?: string;
  /** Optional per-day `sx` override (e.g. tint days in a veto-recess window). */
  dayCellSx?: (cell: CalendarDayCell) => SxProps<Theme>;
}

/**
 * Generic, accessible month grid (no domain knowledge). The caller supplies
 * per-day content via `renderDay` and an `aria-label` via `dayAriaLabel`.
 *
 * Keyboard model (roving tabindex): one day owns tab focus; Arrow keys move by
 * day/week within the visible 6×7 grid, Home/End jump to the start/end of the
 * week, and PageUp/PageDown change month. Enter/Space select the focused day.
 */
export function CalendarMonthGrid({
  month,
  selectedIso,
  onSelectDay,
  onMonthChange,
  renderDay,
  dayAriaLabel,
  gridAriaLabel = 'Calendar',
  dayCellSx,
}: CalendarMonthGridProps) {
  const weeks = useMemo(() => buildMonthMatrix(month.year, month.month), [month.year, month.month]);
  const cells = useMemo(() => weeks.flat(), [weeks]);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());
  // When a keyboard action lands us on a new month, focus the matching day after render.
  const pendingFocusIso = useRef<string | null>(null);

  const defaultFocusIso = useCallback((): string => {
    const inSelected = selectedIso && cells.find((c) => c.iso === selectedIso && c.inMonth);
    if (inSelected) return selectedIso!;
    const today = cells.find((c) => c.isToday && c.inMonth);
    if (today) return today.iso;
    const firstInMonth = cells.find((c) => c.inMonth);
    return firstInMonth?.iso ?? cells[0]!.iso;
  }, [cells, selectedIso]);

  const [focusedIso, setFocusedIso] = useState<string>(() => defaultFocusIso());

  // Keep the roving-tabindex target valid as the month (or selection) changes.
  useEffect(() => {
    setFocusedIso((prev) => (cells.some((c) => c.iso === prev) ? prev : defaultFocusIso()));
  }, [cells, defaultFocusIso]);

  // Restore DOM focus after a keyboard-driven month change.
  useEffect(() => {
    if (!pendingFocusIso.current) return;
    const target =
      cells.find((c) => c.iso === pendingFocusIso.current && c.inMonth)?.iso ??
      cells.find((c) => c.inMonth)?.iso ??
      null;
    pendingFocusIso.current = null;
    if (target) {
      setFocusedIso(target);
      dayRefs.current.get(target)?.focus();
    }
  }, [cells]);

  const focusIso = useCallback((iso: string) => {
    setFocusedIso(iso);
    dayRefs.current.get(iso)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const index = cells.findIndex((c) => c.iso === focusedIso);
      if (index < 0) return;
      let next = index;
      switch (event.key) {
        case 'ArrowLeft':
          next = index - 1;
          break;
        case 'ArrowRight':
          next = index + 1;
          break;
        case 'ArrowUp':
          next = index - 7;
          break;
        case 'ArrowDown':
          next = index + 7;
          break;
        case 'Home':
          next = index - (index % 7);
          break;
        case 'End':
          next = index - (index % 7) + 6;
          break;
        case 'PageUp':
          event.preventDefault();
          pendingFocusIso.current = focusedIso;
          onMonthChange(addMonths(month, -1));
          return;
        case 'PageDown':
          event.preventDefault();
          pendingFocusIso.current = focusedIso;
          onMonthChange(addMonths(month, 1));
          return;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelectDay(focusedIso);
          return;
        default:
          return;
      }
      event.preventDefault();
      if (next >= 0 && next < cells.length) {
        focusIso(cells[next]!.iso);
      }
    },
    [cells, focusedIso, focusIso, month, onMonthChange, onSelectDay],
  );

  return (
    <Box>
      {/* Month navigation header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.5,
        }}
      >
        <IconButton
          aria-label="Previous month"
          onClick={() => onMonthChange(addMonths(month, -1))}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ChevronLeft />
        </IconButton>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            component="h2"
            aria-live="polite"
            sx={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }}
          >
            {monthLabel(month)}
          </Typography>
          {!isSameMonth(month, currentMonth()) && (
            <Button
              size="small"
              onClick={() => onMonthChange(currentMonth())}
              sx={{ textTransform: 'none', minHeight: 28, py: 0, mt: 0.25 }}
            >
              Back to today
            </Button>
          )}
        </Box>
        <IconButton
          aria-label="Next month"
          onClick={() => onMonthChange(addMonths(month, 1))}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ChevronRight />
        </IconButton>
      </Box>

      <Box
        role="grid"
        aria-label={`${gridAriaLabel}, ${monthLabel(month)}`}
        onKeyDown={handleKeyDown}
      >
        {/* Weekday header */}
        <Box role="row" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
          {WEEKDAYS.map((wd) => (
            <Typography
              key={wd.short}
              role="columnheader"
              variant="caption"
              aria-label={wd.full}
              sx={{
                textAlign: 'center',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                py: 0.5,
              }}
            >
              <Box component="span" aria-hidden>
                {wd.short}
              </Box>
            </Typography>
          ))}
        </Box>

        {/* Week rows */}
        {weeks.map((week) => (
          <Box
            key={week[0]!.iso}
            role="row"
            sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.25, sm: 0.5 } }}
          >
            {week.map((cell) => {
              const isSelected = cell.iso === selectedIso;
              return (
                <Box key={cell.iso} role="gridcell" sx={{ minWidth: 0 }}>
                  <Box
                    component="button"
                    type="button"
                    ref={(el: HTMLButtonElement | null) => {
                      if (el) dayRefs.current.set(cell.iso, el);
                      else dayRefs.current.delete(cell.iso);
                    }}
                    tabIndex={cell.iso === focusedIso ? 0 : -1}
                    aria-label={dayAriaLabel(cell)}
                    aria-pressed={isSelected}
                    aria-current={cell.isToday ? 'date' : undefined}
                    onClick={() => {
                      setFocusedIso(cell.iso);
                      onSelectDay(cell.iso);
                    }}
                    sx={{
                      appearance: 'none',
                      width: '100%',
                      minHeight: { xs: 52, sm: 76 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 0.25,
                      p: { xs: 0.5, sm: 0.75 },
                      cursor: 'pointer',
                      textAlign: 'left',
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      border: '1px solid',
                      borderColor: cell.isToday ? 'primary.main' : 'divider',
                      borderRadius: 1.5,
                      color: cell.inMonth ? 'text.primary' : 'text.disabled',
                      opacity: cell.inMonth ? 1 : 0.55,
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                      ...((dayCellSx?.(cell) as object) ?? {}),
                      '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                      '&:focus-visible': FOCUS_RING,
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: cell.isToday ? 800 : 600,
                        color: cell.isToday ? 'primary.main' : 'inherit',
                        lineHeight: 1.2,
                      }}
                    >
                      {cell.day}
                    </Typography>
                    {renderDay(cell)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
