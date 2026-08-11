import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { supabaseAdmin } from '@/app/lib/supabaseAdminCore';

// Auth is handled by src/middleware.ts, same as /admin/sync-status.

// ---------------------------------------------------------------------------
// Types & fetching
// ---------------------------------------------------------------------------

/**
 * `ky_accuracy_runs.domain_summary` is a JSONB record keyed by domain. The
 * shape mirrors what history.ts writes; keep this narrow to what this page
 * actually consumes so a schema change is a compiler-visible break.
 */
interface DomainSummary {
  checked: number;
  passed: number;
  warnings: number;
  failures: number;
  durationMs?: number;
  skipped?: boolean;
  skipReason?: string | null;
  error?: string | null;
  outage?: boolean;
  outageSource?: string | null;
  upstreamFailures?: number;
  underCoverage?: boolean;
  coverageFloor?: number | null;
}

interface RunRow {
  id: string;
  started_at: string;
  duration_ms: number;
  seed: number;
  checked: number;
  passed: number;
  warnings: number;
  failures: number;
  errored_domains: string[] | null;
  has_operational_error: boolean;
  domain_summary: Record<string, DomainSummary> | null;
}

const RUN_LIMIT = 12;

async function fetchRuns(): Promise<RunRow[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('ky_accuracy_runs')
    .select(
      'id, started_at, duration_ms, seed, checked, passed, warnings, failures, errored_domains, has_operational_error, domain_summary',
    )
    .order('started_at', { ascending: false })
    .limit(RUN_LIMIT);
  if (error) {
    console.error('[admin/accuracy] ky_accuracy_runs query failed:', error.message);
    return [];
  }
  return (data ?? []) as RunRow[];
}

// ---------------------------------------------------------------------------
// Derived state — same taxonomy the CLI/Slack digest uses
// ---------------------------------------------------------------------------

/**
 * Order matters — this is the same precedence as `slackStatusLabel` in
 * report.ts. If the two ever diverge, the trend view will read a run
 * differently than the digest posted about it. Keep in sync.
 */
type RunState =
  | 'operational-error'
  | 'upstream-outage'
  | 'under-coverage'
  | 'content-failures'
  | 'content-warnings'
  | 'all-clear';

function runState(row: RunRow): RunState {
  if ((row.errored_domains?.length ?? 0) > 0 || row.has_operational_error) return 'operational-error';
  const summary = row.domain_summary ?? {};
  const outageDomains = Object.keys(summary).filter((d) => summary[d]?.outage);
  if (outageDomains.length > 0) return 'upstream-outage';
  const underCoverageDomains = Object.keys(summary).filter((d) => summary[d]?.underCoverage);
  if (underCoverageDomains.length > 0) return 'under-coverage';
  if (row.failures > 0) return 'content-failures';
  if (row.warnings > 0) return 'content-warnings';
  return 'all-clear';
}

function stateColor(
  state: RunState,
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  switch (state) {
    case 'operational-error':
      return 'error';
    case 'upstream-outage':
      return 'warning';
    case 'under-coverage':
      return 'warning';
    case 'content-failures':
      return 'error';
    case 'content-warnings':
      return 'warning';
    case 'all-clear':
      return 'success';
  }
}

function stateLabel(state: RunState): string {
  return state
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(0)}s`;
  const m = s / 60;
  return `${m.toFixed(1)}m`;
}

/**
 * Signed integer delta with a leading sign glyph, or an em-dash when no prior
 * run is available. Rendered right-aligned in the table so deltas line up.
 */
function delta(current: number, prev: number | null): string {
  if (prev == null) return '—';
  const d = current - prev;
  if (d === 0) return '±0';
  return d > 0 ? `+${d}` : `${d}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export const dynamic = 'force-dynamic';

export default async function AccuracyTrendPage() {
  const runs = await fetchRuns();

  if (runs.length === 0) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
          Content accuracy audit — trend
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No runs recorded yet. The weekly audit populates <code>ky_accuracy_runs</code> on
          Sundays 07:00 UTC (see <code>docs/accuracy-audit.md</code>).
        </Typography>
      </Box>
    );
  }

  const latest = runs[0]!;
  const latestState = runState(latest);
  const latestDomainSummary = latest.domain_summary ?? {};

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        Content accuracy audit — trend
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Latest {runs.length} of the weekly runs recorded in <code>ky_accuracy_runs</code>. Same
        taxonomy the Slack digest uses; see <code>docs/accuracy-audit.md</code> for what each
        state means.
      </Typography>

      <Stack spacing={3}>
        {/* Latest run summary */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6">Latest run — {formatDate(latest.started_at)}</Typography>
              <Chip label={stateLabel(latestState)} color={stateColor(latestState)} size="small" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              seed <code>{latest.seed}</code> · {formatDuration(latest.duration_ms)}
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Typography variant="body2">
                <strong>{latest.checked.toLocaleString()}</strong> checked
              </Typography>
              <Typography variant="body2">
                <strong>{latest.passed.toLocaleString()}</strong> ok
              </Typography>
              {latest.failures > 0 && (
                <Typography variant="body2" color="error">
                  <strong>{latest.failures.toLocaleString()}</strong> fail
                </Typography>
              )}
              {latest.warnings > 0 && (
                <Typography variant="body2" color="warning.main">
                  <strong>{latest.warnings.toLocaleString()}</strong> warn
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Per-domain grid — latest only */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Per-domain — latest run
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Domain</TableCell>
                  <TableCell align="right">Checked</TableCell>
                  <TableCell align="right">OK</TableCell>
                  <TableCell align="right">Fail</TableCell>
                  <TableCell align="right">Warn</TableCell>
                  <TableCell>State</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(latestDomainSummary).map(([domain, s]) => {
                  let stateChip: { label: string; color: 'success' | 'warning' | 'error' | 'default' } = {
                    label: 'ok',
                    color: 'success',
                  };
                  if (s.error) stateChip = { label: 'error', color: 'error' };
                  else if (s.outage) stateChip = { label: `outage (${s.outageSource ?? '?'})`, color: 'warning' };
                  else if (s.underCoverage)
                    stateChip = { label: `under-coverage (floor ${s.coverageFloor ?? '?'})`, color: 'warning' };
                  else if (s.skipped) stateChip = { label: 'skipped', color: 'default' };
                  else if (s.failures > 0) stateChip = { label: 'fail', color: 'error' };
                  else if (s.warnings > 0) stateChip = { label: 'warn', color: 'warning' };
                  return (
                    <TableRow key={domain}>
                      <TableCell>{domain}</TableCell>
                      <TableCell align="right">{s.checked.toLocaleString()}</TableCell>
                      <TableCell align="right">{s.passed.toLocaleString()}</TableCell>
                      <TableCell align="right">{s.failures}</TableCell>
                      <TableCell align="right">{s.warnings}</TableCell>
                      <TableCell>
                        <Chip label={stateChip.label} color={stateChip.color} size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent runs — one row per run, deltas vs prior */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent runs
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>State</TableCell>
                  <TableCell align="right">Checked</TableCell>
                  <TableCell align="right">OK</TableCell>
                  <TableCell align="right">Fail</TableCell>
                  <TableCell align="right">Δ fail</TableCell>
                  <TableCell align="right">Warn</TableCell>
                  <TableCell align="right">Δ warn</TableCell>
                  <TableCell align="right">Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run, idx) => {
                  const state = runState(run);
                  // Deltas vs the run BEFORE this one chronologically — since runs
                  // are sorted newest-first, that's the row at `idx + 1`.
                  const prior = runs[idx + 1] ?? null;
                  return (
                    <TableRow key={run.id}>
                      <TableCell>{formatDate(run.started_at)}</TableCell>
                      <TableCell>
                        <Chip label={stateLabel(state)} color={stateColor(state)} size="small" />
                      </TableCell>
                      <TableCell align="right">{run.checked.toLocaleString()}</TableCell>
                      <TableCell align="right">{run.passed.toLocaleString()}</TableCell>
                      <TableCell align="right">{run.failures}</TableCell>
                      <TableCell align="right">{delta(run.failures, prior?.failures ?? null)}</TableCell>
                      <TableCell align="right">{run.warnings}</TableCell>
                      <TableCell align="right">{delta(run.warnings, prior?.warnings ?? null)}</TableCell>
                      <TableCell align="right">{formatDuration(run.duration_ms)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
