import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLegislativeCalendarHtml } from './lrc-legislative-calendar-parser';
import { classifyCalendarParse } from './ky-lrc-calendar-sync';

const FIXTURES = join(process.cwd(), 'fixtures', 'lrc');
const readFixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');

function page(body: string): string {
  return `<!DOCTYPE html><html><head><title>Legislative Calendar</title></head><body>
    <h2>Daily Legislative Calendar</h2>
    <div class="panel.style1">${body}</div>
  </body></html>`;
}

describe('page-wide "There are no meetings scheduled." notice', () => {
  test('live empty page (2026-11-08): no day headings, notice detected, healthy', () => {
    const html = readFixture('legislative-calendar-no-meetings.html');
    const parsed = parseLegislativeCalendarHtml(html);
    assert.equal(parsed.stats.dayCount, 0);
    assert.equal(parsed.stats.meetingCount, 0);
    assert.equal(parsed.stats.pageNoMeetingsNotice, true);
    assert.deepEqual(classifyCalendarParse(parsed, html.length), { kind: 'empty_page' });
  });

  test('notice matches case-insensitively and across odd whitespace', () => {
    const parsed = parseLegislativeCalendarHtml(
      page('<h2>\n  THERE   are\n\tNO meetings\n   Scheduled.</h2>'),
    );
    assert.equal(parsed.stats.dayCount, 0);
    assert.equal(parsed.stats.pageNoMeetingsNotice, true);
  });

  test('a calendar with day headings is classified by its days, not the notice', () => {
    const html = readFixture('legislative-calendar-live.html');
    const parsed = parseLegislativeCalendarHtml(html);
    assert.ok(parsed.stats.dayCount > 0);
    assert.equal(parsed.stats.pageNoMeetingsNotice, false);
    assert.deepEqual(classifyCalendarParse(parsed, html.length), { kind: 'days' });
  });
});

describe('zero day headings without the notice still errors', () => {
  test('page with neither day headings nor the notice is unreadable', () => {
    const html = page('<div class="SomeNewLayout"><p>Committee on Things — 10:00 AM</p></div>');
    const parsed = parseLegislativeCalendarHtml(html);
    assert.equal(parsed.stats.dayCount, 0);
    assert.equal(parsed.stats.pageNoMeetingsNotice, false);
    const outcome = classifyCalendarParse(parsed, html.length);
    assert.equal(outcome.kind, 'unreadable');
    assert.match(
      outcome.kind === 'unreadable' ? outcome.error : '',
      /parsed to 0 day headings \(\d+ bytes\) — the page structure likely changed/,
    );
  });

  test('a stray day-level "No meetings scheduled" is not the page-wide notice', () => {
    const parsed = parseLegislativeCalendarHtml(
      page('<div class="CommitteeName">No meetings scheduled</div>'),
    );
    assert.equal(parsed.stats.dayCount, 0);
    assert.equal(parsed.stats.pageNoMeetingsNotice, false);
    assert.equal(classifyCalendarParse(parsed, 0).kind, 'unreadable');
  });
});
