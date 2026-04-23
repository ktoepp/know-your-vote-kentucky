#!/usr/bin/env npx tsx
/**
 * Quick check that .env.local has non-placeholder values for app + sync + map.
 */
import './load-env';

const REQUIRED: { key: string; hint?: string }[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY' },
  { key: 'OPENSTATES_API_KEY' },
  { key: 'LEGISCAN_API_KEY' },
  { key: 'SYNC_API_KEY' },
  { key: 'ANTHROPIC_API_KEY' },
  { key: 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN', hint: 'required for /members/map' },
];

function looksPlaceholder(v: string): boolean {
  const t = v.trim().toLowerCase();
  return t.startsWith('your_') || t.includes('_here') || t === 'changeme';
}

let failed = false;
for (const { key, hint } of REQUIRED) {
  const v = process.env[key];
  if (!v || looksPlaceholder(v)) {
    console.error(`  ${key}: missing or placeholder${hint ? ` (${hint})` : ''}`);
    failed = true;
  }
}

if (failed) {
  console.error('\nCopy env-template.txt to .env.local and set real values.\n');
  process.exit(1);
}

console.log('Environment looks OK for core app, Kentucky sync, and district map.\n');
