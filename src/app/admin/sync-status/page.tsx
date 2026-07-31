import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';
import {
  evaluateSourceHealth,
  UNMONITORED_SOURCES,
  type SourceRow,
} from '@/lib/source-health';

// Auth is handled by middleware (src/middleware.ts) — no inline check needed.

// ---------------------------------------------------------------------------
// Date helpers (no external library)
// ---------------------------------------------------------------------------
function formatRelative(date: string | null): string {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  if (isNaN(diff)) return '—';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs} second${secs !== 1 ? 's' : ''} ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function last7DayKeys(): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    );
  }
  return keys;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
type CounterRow = { key: string; payload: Record<string, number> } | null;

async function fetchCounter(key: string): Promise<Record<string, number> | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('ky_sync_state')
    .select('payload')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  return (data as CounterRow & { payload: Record<string, number> })?.payload ?? null;
}

/**
 * `ky_sources` columns are `source_name` / `last_sync_at` / `status`. This
 * previously selected `id, last_synced_at, last_status` — none of which exist —
 * so PostgREST errored, the `return []` below swallowed it, and the Data Sources
 * table rendered permanently empty.
 */
async function fetchSources(): Promise<SourceRow[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('ky_sources')
    .select('source_name, status, last_sync_at, items_synced, error_message')
    .order('source_name');
  if (error || !data) {
    if (error) console.error('[admin/sync-status] ky_sources query failed:', error.message);
    return [];
  }
  return data as SourceRow[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export default async function SyncStatusPage() {
  const [legiscanPayload, cacheHitsPayload, cacheMissesPayload, rateLimitPayload, sources] =
    await Promise.all([
      fetchCounter('legiscan_query_counter'),
      fetchCounter('anthropic_cache_hits'),
      fetchCounter('anthropic_cache_misses'),
      fetchCounter('rate_limit_denies'),
      fetchSources(),
    ]);

  // Freshness/status verdict per source — same evaluator the health-check cron
  // uses, so this page and the Slack alert can never disagree.
  const health = evaluateSourceHealth(sources);
  const breachBySource = new Map(health.breaches.map((b) => [b.source, b]));

  // LegiScan quota
  const monthKey = currentMonthKey();
  const legiscanUsed = legiscanPayload?.[monthKey] ?? null;
  const legiscanTotal = 30000;
  const legiscanPct = legiscanUsed != null ? (legiscanUsed / legiscanTotal) * 100 : 0;
  const progressColor: 'primary' | 'warning' | 'error' =
    legiscanUsed == null ? 'primary' : legiscanPct >= 95 ? 'error' : legiscanPct >= 80 ? 'warning' : 'primary';

  // Anthropic cache
  const dayKeys = last7DayKeys();
  let totalHits = 0;
  let totalMisses = 0;
  let hasCache = false;
  for (const dk of dayKeys) {
    const h = cacheHitsPayload?.[dk] ?? 0;
    const m = cacheMissesPayload?.[dk] ?? 0;
    totalHits += h;
    totalMisses += m;
    if (cacheHitsPayload?.[dk] !== undefined || cacheMissesPayload?.[dk] !== undefined) hasCache = true;
  }
  const hitRate = totalHits + totalMisses > 0 ? Math.round((totalHits / (totalHits + totalMisses)) * 100) : null;

  // Rate limit denies
  const today = todayKey();
  const denies24h = rateLimitPayload?.[today] ?? 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Sync &amp; Rate-Limit Status
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Operator dashboard — server-rendered, read-only.
      </Typography>

      <Stack spacing={3}>
        {/* LegiScan Quota */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              LegiScan Monthly Quota
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Month: {monthKey}
            </Typography>
            {legiscanUsed != null ? (
              <>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>{legiscanUsed.toLocaleString()}</strong> / {legiscanTotal.toLocaleString()} queries used
                  {' '}({legiscanPct.toFixed(1)}%)
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(legiscanPct, 100)}
                  color={progressColor}
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </>
            ) : (
              <Typography variant="body1" color="text.secondary">
                — (no data yet)
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Anthropic Cache */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Anthropic Cache
            </Typography>
            {hasCache ? (
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography variant="body1">
                  Last 7 days: <strong>{totalHits}</strong> hits, <strong>{totalMisses}</strong> misses
                </Typography>
                {hitRate != null && (
                  <Chip
                    label={`${hitRate}% hit rate`}
                    color={hitRate >= 50 ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </Stack>
            ) : (
              <Typography variant="body1" color="text.secondary">
                —
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Rate-Limit Denies */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rate-Limit Denies
            </Typography>
            <Typography variant="body1">
              Last 24h ({today}): <strong>{denies24h}</strong>{' '}
              {denies24h > 0 && (
                <Chip label="denies" color="warning" size="small" sx={{ ml: 1 }} />
              )}
            </Typography>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Sources
            </Typography>
            {sources.length === 0 ? (
              <Typography variant="body1" color="text.secondary">
                — (no sources found or supabaseAdmin unavailable)
              </Typography>
            ) : (
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Source', 'Last synced', 'Status'].map((col) => (
                      <Box
                        key={col}
                        component="th"
                        sx={{ textAlign: 'left', pb: 1, pr: 2, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          {col}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {sources.map((src, i) => {
                    const breach = breachBySource.get(src.source_name);
                    const unmonitored = src.source_name in UNMONITORED_SOURCES;
                    return (
                    <Box component="tr" key={src.source_name}>
                      <Box component="td" sx={{ py: 1, pr: 2, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <Typography variant="body2" fontFamily="monospace">
                          {src.source_name}
                        </Typography>
                        {unmonitored ? (
                          <Typography variant="caption" color="text.secondary" display="block">
                            not monitored — {UNMONITORED_SOURCES[src.source_name]}
                          </Typography>
                        ) : breach ? (
                          <Typography variant="caption" color="error" display="block">
                            {breach.kind}: {breach.message}
                          </Typography>
                        ) : null}
                      </Box>
                      <Box component="td" sx={{ py: 1, pr: 2, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <Typography variant="body2" title={src.last_sync_at ?? undefined}>
                          {formatRelative(src.last_sync_at)}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ py: 1, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        {src.status ? (
                          <Chip
                            label={src.status}
                            size="small"
                            color={
                              breach
                                ? 'error'
                                : unmonitored
                                ? 'default'
                                : src.status === 'success'
                                ? 'success'
                                : src.status === 'error'
                                ? 'error'
                                : 'default'
                            }
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </Box>
                    </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
