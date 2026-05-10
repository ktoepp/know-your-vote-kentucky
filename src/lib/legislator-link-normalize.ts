/**
 * Normalize and rank outbound legislator URLs (Open States links, LRC, campaign sites).
 * Used at sync time and defensively when resolving profile targets in the UI.
 */

const HTTP_HOSTS_UPGRADE = [
  'legislature.ky.gov',
  'ballotpedia.org',
  'legiscan.com',
  'openstates.org',
  'apps.legislature.ky.gov',
] as const;

const SOCIAL_ROOT_DOMAINS = new Set([
  'twitter.com',
  'x.com',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'linkedin.com',
  'threads.net',
  'truth.social',
  'pinterest.com',
  'flickr.com',
]);

export function isSocialMediaHost(host: string): boolean {
  const h = host.replace(/^www\./i, '').toLowerCase();
  if (h === 'twitter.com' || h === 'x.com') return true;
  for (const d of SOCIAL_ROOT_DOMAINS) {
    if (h === d || h.endsWith(`.${d}`)) return true;
  }
  return false;
}

export function normalizeHttpsUrl(url: string | null | undefined): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  try {
    const href = raw.startsWith('//') ? `https:${raw}` : raw;
    const u = new URL(href);
    if (!/^https?:$/i.test(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    if (u.protocol === 'http:') {
      const upgrade = HTTP_HOSTS_UPGRADE.some((h) => host === h || host.endsWith(`.${h}`));
      if (upgrade) u.protocol = 'https:';
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isKentuckyLegislatureHost(host: string): boolean {
  return host === 'legislature.ky.gov' || host.endsWith('.legislature.ky.gov');
}

/** Legacy Kentucky LRC hostnames; official profiles moved to legislature.ky.gov and often break hotlinked URLs. */
export function isObsoleteKyLrcHostname(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, '').toLowerCase();
  return h === 'lrc.ky.gov' || h.endsWith('.lrc.ky.gov');
}

/** Higher score = better direct legislator page (vs chamber landing pages). */
export function scoreKentuckyLegislatureProfileUrl(url: string): number {
  const lower = url.toLowerCase();
  let score = 0;
  if (lower.includes('legislator-profile.aspx')) score += 100;
  if (lower.includes('districtnumber=')) score += 40;
  if (lower.includes('/legislators/') && lower.includes('members')) score += 15;
  if (lower.includes('apps.legislature.ky.gov')) score += 5;
  return score;
}

export function pickBestKentuckyLegislatureLink(urls: string[]): string | null {
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const u of urls) {
    const n = normalizeHttpsUrl(u);
    if (!n || seen.has(n)) continue;
    if (isObsoleteKyLrcHostname(hostnameOf(n))) continue;
    seen.add(n);
    uniq.push(n);
  }
  if (uniq.length === 0) return null;
  uniq.sort((a, b) => scoreKentuckyLegislatureProfileUrl(b) - scoreKentuckyLegislatureProfileUrl(a));
  return uniq[0]!;
}

function scoreNonLegislatureLink(note: string): number {
  let score = 0;
  if (/official|campaign|homepage|web\s*site|website|personal|constituent/i.test(note)) score += 35;
  if (/photo|image|headshot|picture|portrait/i.test(note)) score -= 25;
  return score;
}

/**
 * From Open States `links[]`: best LRC profile URL and best non-LRC, non-social campaign/official site.
 */
export function extractOpenStatesLegislatorWebLinksFromRaw(
  links: Array<{ url?: string; note?: string }> | null | undefined,
): { lrcProfileUrl: string | null; otherWebsiteUrl: string | null } {
  if (!Array.isArray(links)) return { lrcProfileUrl: null, otherWebsiteUrl: null };

  const lrcCandidates: string[] = [];
  const others: Array<{ url: string; score: number }> = [];

  for (const item of links) {
    const rawUrl = typeof item?.url === 'string' ? item.url.trim() : '';
    if (!rawUrl) continue;
    const normalized = normalizeHttpsUrl(rawUrl);
    if (!normalized || !/^https:\/\//i.test(normalized)) continue;

    const host = hostnameOf(normalized);
    if (!host) continue;

    if (isKentuckyLegislatureHost(host)) {
      lrcCandidates.push(normalized);
      continue;
    }

    if (isSocialMediaHost(host)) continue;

    const note = String(item?.note ?? '').toLowerCase();
    others.push({ url: normalized, score: scoreNonLegislatureLink(note) });
  }

  others.sort((a, b) => b.score - a.score);

  return {
    lrcProfileUrl: pickBestKentuckyLegislatureLink(lrcCandidates),
    otherWebsiteUrl: others[0]?.url ?? null,
  };
}
