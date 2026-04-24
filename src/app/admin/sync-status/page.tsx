import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';

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

async function fetchSources(): Promise<Array<{ id: string; last_synced_at: string | null; last_status: string | null }>> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('ky_sources')
    .select('id, last_synced_at, last_status')
    .order('id');
  if (error || !data) return [];
  return data as Array<{ id: string; last_synced_at: string | null; last_status: string | null }>;
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
                  {sources.map((src, i) => (
                    <Box component="tr" key={src.id}>
                      <Box component="td" sx={{ py: 1, pr: 2, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <Typography variant="body2" fontFamily="monospace">
                          {src.id}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ py: 1, pr: 2, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        <Typography variant="body2" title={src.last_synced_at ?? undefined}>
                          {formatRelative(src.last_synced_at)}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ py: 1, borderBottom: i < sources.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                        {src.last_status ? (
                          <Chip
                            label={src.last_status}
                            size="small"
                            color={
                              src.last_status === 'ok' || src.last_status === 'success'
                                ? 'success'
                                : src.last_status === 'error'
                                ? 'error'
                                : 'default'
                            }
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
