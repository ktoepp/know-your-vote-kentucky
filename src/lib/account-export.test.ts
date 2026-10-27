import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EXPORT_COMMITTEE_FOLLOW_COLUMNS,
  EXPORT_NOTIFICATION_LOG_COLUMNS,
  toSelectList,
} from './account-export';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const DRIFT_MESSAGE = 'Export selects a column no migration creates.';

/** Strip `-- line` and `/* block *\/` comments so commented-out SQL never counts. */
function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Regex fragment matching `table`, `public.table` or quoted forms of either. */
function tableNamePattern(table: string): string {
  return `(?:"?public"?\\.)?"?${table}"?`;
}

/** Split on commas that are not inside parentheses. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

const TABLE_CONSTRAINT_KEYWORDS = new Set([
  'constraint',
  'primary',
  'unique',
  'check',
  'foreign',
  'exclude',
  'like',
]);

/**
 * Column names a migration's SQL creates for `table`, from
 * `CREATE TABLE … table (…)` bodies and `ALTER TABLE … table … ADD COLUMN name`.
 */
function columnsCreatedFor(sqlText: string, table: string): Set<string> {
  const sql = stripSqlComments(sqlText);
  const columns = new Set<string>();
  const name = tableNamePattern(table);

  const createRe = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${name}\\s*\\(`, 'gi');
  for (const match of sql.matchAll(createRe)) {
    // Walk to the matching close paren of the column list.
    let depth = 1;
    let i = (match.index ?? 0) + match[0].length;
    const start = i;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth += 1;
      if (sql[i] === ')') depth -= 1;
      i += 1;
    }
    const body = sql.slice(start, i - 1);
    for (const entry of splitTopLevel(body)) {
      const first = entry.trim().match(/^"?([A-Za-z_][A-Za-z0-9_]*)"?/);
      if (!first) continue;
      const col = first[1].toLowerCase();
      if (!TABLE_CONSTRAINT_KEYWORDS.has(col)) columns.add(col);
    }
  }

  const alterRe = new RegExp(
    `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:ONLY\\s+)?${name}\\s([^;]*)`,
    'gi',
  );
  for (const match of sql.matchAll(alterRe)) {
    const addRe = /ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?/gi;
    for (const add of match[1].matchAll(addRe)) {
      const col = add[1].toLowerCase();
      if (!TABLE_CONSTRAINT_KEYWORDS.has(col)) columns.add(col);
    }
  }

  return columns;
}

function columnsFromAllMigrations(table: string): Set<string> {
  const all = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const col of columnsCreatedFor(sql, table)) all.add(col);
  }
  return all;
}

function assertExportColumnsExist(table: string, exported: readonly string[]) {
  const created = columnsFromAllMigrations(table);
  assert.ok(created.size > 0, `No migration creates ${table}.`);
  const missing = exported.filter((col) => !created.has(col));
  assert.deepEqual(missing, [], `${DRIFT_MESSAGE} ${table}: ${missing.join(', ')}`);
}

describe('account export columns match the migrations', () => {
  test('every ky_notifications_log export column is created by a migration', () => {
    assertExportColumnsExist('ky_notifications_log', EXPORT_NOTIFICATION_LOG_COLUMNS);
  });

  test('every ky_committee_follows export column is created by a migration', () => {
    assertExportColumnsExist('ky_committee_follows', EXPORT_COMMITTEE_FOLLOW_COLUMNS);
  });
});

describe('columnsCreatedFor', () => {
  test('reads CREATE TABLE bodies and skips table constraints', () => {
    const sql = `
      CREATE TABLE public.ky_committee_follows (
        user_id UUID NOT NULL,
        committee_id UUID NOT NULL REFERENCES public.ky_committees(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, committee_id)
      );`;
    assert.deepEqual(
      [...columnsCreatedFor(sql, 'ky_committee_follows')].sort(),
      ['committee_id', 'created_at', 'user_id'],
    );
  });

  test('reads ALTER TABLE … ADD COLUMN, including IF NOT EXISTS', () => {
    const sql = `
      ALTER TABLE public.ky_notifications_log
        ADD COLUMN committee_event_ids BIGINT[] NOT NULL DEFAULT '{}';
      ALTER TABLE ky_notifications_log ADD COLUMN IF NOT EXISTS kind TEXT;`;
    assert.deepEqual(
      [...columnsCreatedFor(sql, 'ky_notifications_log')].sort(),
      ['committee_event_ids', 'kind'],
    );
  });

  test('ignores other tables, comments and column-name prefixes of the table name', () => {
    const sql = `
      -- ALTER TABLE ky_notifications_log ADD COLUMN event_count INT;
      ALTER TABLE ky_notifications_log_archive ADD COLUMN digest_frequency TEXT;
      CREATE TABLE public.other_table (created_at TIMESTAMPTZ);`;
    assert.equal(columnsCreatedFor(sql, 'ky_notifications_log').size, 0);
  });

  test('finds the real migration 041 column, so the drift check is not vacuous', () => {
    assert.ok(columnsFromAllMigrations('ky_notifications_log').has('committee_event_ids'));
  });

  test('a column no migration creates is reported', () => {
    const created = columnsFromAllMigrations('ky_notifications_log');
    for (const col of ['digest_frequency', 'event_count']) {
      assert.equal(created.has(col), false, `${col} should not exist on ky_notifications_log`);
    }
  });
});

describe('toSelectList', () => {
  test('joins columns for a Supabase select', () => {
    assert.equal(toSelectList(EXPORT_COMMITTEE_FOLLOW_COLUMNS), 'committee_id, created_at');
  });
});
