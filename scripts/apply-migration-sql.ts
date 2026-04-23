#!/usr/bin/env npx tsx
/**
 * Run a single SQL migration file against the remote Supabase Postgres database.
 *
 * Prefer the connection URI from the dashboard (Settings → Database → URI).
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@...
 *
 * Alternatively set SUPABASE_DB_PASSWORD (database password) plus NEXT_PUBLIC_SUPABASE_URL;
 * the script builds postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
 *
 * Usage:
 *   npx tsx scripts/apply-migration-sql.ts
 *   npx tsx scripts/apply-migration-sql.ts supabase/migrations/004_ky_legislators_lrc_profile_url.sql
 */
import './load-env';
import * as fs from 'fs';
import * as path from 'path';
import pg from 'pg';

function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

function connectionString(): string {
  const direct = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (direct?.trim()) return direct.trim();

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !publicUrl) {
    console.error(
      'Set DATABASE_URL (or SUPABASE_DB_URL) from Supabase → Database settings,\n' +
        'or set SUPABASE_DB_PASSWORD and NEXT_PUBLIC_SUPABASE_URL.\n',
    );
    process.exit(1);
  }
  const ref = projectRefFromSupabaseUrl(publicUrl);
  if (!ref) {
    console.error('NEXT_PUBLIC_SUPABASE_URL must look like https://<ref>.supabase.co');
    process.exit(1);
  }
  const user = encodeURIComponent('postgres');
  const pw = encodeURIComponent(password);
  return `postgresql://${user}:${pw}@db.${ref}.supabase.co:5432/postgres`;
}

async function main() {
  const rel = process.argv[2] || 'supabase/migrations/004_ky_legislators_lrc_profile_url.sql';
  const sqlPath = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  if (!fs.existsSync(sqlPath)) {
    console.error('File not found:', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const conn = connectionString();
  const client = new pg.Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Applied:', sqlPath);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
