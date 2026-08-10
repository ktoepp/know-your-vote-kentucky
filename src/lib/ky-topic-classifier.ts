/**
 * Kentucky Topic Classifier
 * Classifies civic content into Kentucky-specific topic taxonomy.
 * Uses keyword matching for speed with AI fallback for ambiguous items.
 */
import Anthropic from '@anthropic-ai/sdk';
import { KY_DEFAULT_ANTHROPIC_MODEL } from './anthropic-model';

/** Kentucky-specific topic taxonomy */
export const KY_TOPICS = [
  'Education',
  'Healthcare',
  'Infrastructure',
  'Taxation',
  'Public Safety',
  'Environment',
  'Labor',
  'Housing',
  'Agriculture',
  'Energy',
  'Criminal Justice',
  'Judiciary',
  'Voting Rights',
  'Local Government',
  'Budget',
  'Corrections',
  'Elections',
  'Higher Education',
  'Veterans Affairs',
  'Alcohol & Cannabis',
  'Gambling',
  'Transportation',
  // Ceremonial resolutions — honors, congratulations, and in-memoriams. Assigned
  // by title shape (see isCeremonialResolution), not body keywords, so these
  // instruments are browsable/searchable as a category instead of collecting
  // incidental policy tags (e.g. SR35 2023, an honor "upon his election", was
  // mislabeled Voting Rights).
  'Honors & Memorials',
] as const;

export type KYTopicTag = (typeof KY_TOPICS)[number];

/** Keyword map for fast classification */
const TOPIC_KEYWORDS: Record<KYTopicTag, string[]> = {
  Education: ['school', 'education', 'student', 'teacher', 'university', 'college', 'curriculum', 'tuition', 'charter', 'jcps', 'fcps', 'superintendent', 'financial literacy'],
  // 'diabetes' added 2026-06-07: student health / chronic disease screening bills may not use the word 'health'.
  // Bare 'drug' removed (2026-06-11): matched controlled-substance language in criminal /
  // search-warrant bills. Use specific healthcare phrasing instead.
  // 'physician'/'physicians' added 2026-07-05: preceptor/licensure bills say "physician", never
  // "doctor"/"health". Both forms listed — the word-boundary regex does not match plurals.
  Healthcare: ['health', 'hospital', 'medicaid', 'medicare', 'insurance', 'mental health', 'opioid', 'prescription drug', 'pharmacy', 'nurse', 'doctor', 'clinic', 'diabetes', 'physician', 'physicians'],
  // Transport keywords (road/highway/transit/transportation/motor vehicle/etc.) moved to the
  // dedicated 'Transportation' topic below. Bare 'construction' removed: it matched finance/legal
  // boilerplate ("construction loans", "construction contracts", "statutory construction") far more
  // than actual public works. Genuine state construction still hits road/highway/water/sewer.
  // (2026-06-04 accuracy-audit follow-up.)
  Infrastructure: ['water', 'sewer', 'wastewater', 'sewage', 'stormwater', 'broadband', 'internet', 'dam'],
  // 'fiscal' removed: it matches "fiscal court" (local gov) and "fiscal note/year/impact" boilerplate, not tax policy.
  Taxation: ['tax', 'revenue', 'property tax', 'sales tax', 'income tax', 'levy', 'assessment'],
  // Bare 'emergency'/'safety' removed: they match the "emergency clause"/"declares an emergency" boilerplate present
  // in many bills, and generic "safety". Use specific public-safety phrasing instead.
  // 'law enforcement' added 2026-06-07: covers game warden, boating officer, and similar sworn-officer bills
  // that don't mention police/sheriff explicitly.
  'Public Safety': ['police', 'fire', 'emergency management', 'emergency services', 'first responder', 'state of emergency', 'public safety', 'crime', '911', 'sheriff', 'ems', 'disaster', 'flood', 'law enforcement', 'body-worn camera', 'body worn camera', 'search warrant', 'electrical shock', 'swimming pool'],
  Environment: ['environment', 'pollution', 'clean water', 'air quality', 'climate', 'conservation', 'wildlife', 'recycling', 'waste', 'coal ash'],
  // Bare singular 'worker' removed (2026-06-04): matched incidental "health care worker"/"social worker"
  // in non-labor bills. Bare 'employment' removed (2026-06-07): matched "employment of pharmacists",
  // "employer-sponsored insurance", etc. Replaced with 'employer', 'labor law', 'employment law'.
  Labor: ['workers', 'wage', 'employer', 'labor law', 'employment law', 'union', 'labor', 'workforce', 'unemployment', 'minimum wage', 'workplace'],
  // 'forcible entry and detainer'/'forcible detainer' added 2026-07-05: KRS 383 eviction bills use
  // the statutory term, never 'eviction'. Full phrases only — bare 'detainer' would match criminal
  // jail-detainer bills and bare 'forcible entry' would match burglary bills.
  Housing: ['housing', 'rent', 'affordable housing', 'zoning', 'landlord', 'tenant', 'homeless', 'eviction', 'mortgage', 'forcible entry and detainer', 'forcible detainer'],
  // 'agricultural'/'cattle'/'cattlemen' added 2026-07-05: word-boundary match misses the adjectival
  // form ("agricultural program trust fund"), and cattle bills may name neither farm nor agriculture.
  Agriculture: ['farm', 'agriculture', 'agricultural', 'crop', 'livestock', 'tobacco', 'bourbon', 'hemp', 'rural', 'usda', 'cattle', 'cattlemen'],
  Energy: ['energy', 'coal', 'natural gas', 'solar', 'wind', 'utility', 'electric', 'pipeline', 'power plant', 'renewable'],
  'Criminal Justice': ['prison', 'jail', 'sentencing', 'parole', 'probation', 'felony', 'misdemeanor', 'incarceration', 'juvenile', 'expungement', 'warrantless', 'no-knock'],
  // Added 2026-07-05 (decisions.md § 2026-07-05 round 3). Deliberately narrow — court structure,
  // judges, and Court of Justice administration. Excluded: bare 'judge'/'judges' (\b matches inside
  // "county judge-executive" — local gov), bare 'court'/'courts' ("fiscal court", "court costs"),
  // and 'circuit court'/'district court' ("may appeal to the Circuit Court" is boilerplate in
  // occupational-licensing and administrative bills).
  Judiciary: ['judiciary', 'judicial', 'supreme court', 'court of appeals', 'court of justice', 'appellate', 'chief justice', 'family court', 'circuit judge', 'district judge', 'judgeship', 'judgeships'],
  // Bare 'registration'/'primary' removed: 'registration' matched generic vehicle/business/
  // professional/motorboat/firearm registration boilerplate (radon contractors, metal detectors,
  // pharmacy techs, optometrists), and 'primary' matched 'primary care'/'primary school'/'primary
  // residence'/'heart attack response'. Replaced with voter-specific phrasing. Plural 'elections'/
  // 'voters' are added because the word-boundary match means singular 'election'/'voter' miss the
  // plurals that genuine "AN ACT relating to elections" bills use (KRS 116/118/120). 'elections'/
  // 'voters' are unambiguous (rarely appear outside an actual elections context), unlike the bare
  // 'registration'/'primary' they replace. (2026-06-03 accuracy-audit follow-up.)
  'Voting Rights': ['voting', 'election', 'elections', 'ballot', 'voter', 'voters', 'voter registration', 'redistricting', 'poll', 'absentee', 'primary election'],
  // Bare 'commissioner' removed: it matches state offices (Commissioner of Agriculture, Insurance Commissioner),
  // not local government. 'fiscal court' / 'magistrate' / 'county judge-executive' are the KY local-gov signals.
  'Local Government': ['county', 'city council', 'metro council', 'mayor', 'magistrate', 'county judge-executive', 'ordinance', 'municipal', 'annexation', 'fiscal court', 'planning commission', 'zoning board', 'louisville metro', 'lexington-fayette', 'special district', 'library district', 'area development district', 'area development districts'],
  Budget: ['budget', 'appropriation', 'spending', 'deficit', 'surplus', 'general fund', 'pension', 'bond'],
  Corrections: ['department of corrections', 'corrections officer', 'inmate', 'warden', 'reentry', 'halfway house', 'correctional facility', 'parole board'],
  // Bare 'county clerk' removed (2026-08-10): KY county clerks handle deeds, marriage licenses,
  // vehicle registration, and general records — not just elections. The keyword mistagged
  // records/document-management bills as "Elections" (accuracy-audit run 372fe76a, seed
  // 3357422353: SB135 2022 RS, HB370 2010 RS, HB135 2023 RS, +2). Genuine election-admin bills
  // still tag via 'election administration' / 'poll worker' / 'voting machine' / 'election
  // official' / 'canvass' / 'precinct', or fall back to Voting Rights (election/ballot/voter).
  Elections: ['election administration', 'poll worker', 'voting machine', 'canvass', 'secretary of state', 'election board', 'precinct', 'election official'],
  'Higher Education': ['higher education', 'postsecondary', 'kctcs', 'council on postsecondary', 'board of regents', 'state university', 'community and technical college'],
  'Veterans Affairs': ['veteran', 'veterans', 'military', 'national guard', 'gi bill', 'armed forces', 'servicemember', 'veterans affairs', 'veterans benefits'],
  'Alcohol & Cannabis': ['alcohol', 'liquor', 'distillery', 'brewery', 'wet-dry', 'cannabis', 'marijuana', 'medical marijuana', 'thc', 'delta-8'],
  Gambling: ['gambling', 'casino', 'sports betting', 'lottery', 'wagering', 'historical horse racing', 'pari-mutuel', 'charitable gaming', 'racing commission'],
  // Un-conflated from Infrastructure (2026-06-04 accuracy-audit follow-up): roads/highways/transit
  // and motor-vehicle/licensing/railroad bills were repeatedly mis-tagged as "Infrastructure" or
  // matched it only incidentally ("private road" in a railroad bill, "Transportation Cabinet" agency
  // name in a vehicle bill). Bare 'bridge' deliberately NOT included here — it matched financial
  // "bridge loans"; genuine bridge bills are still surfaced via the LegiScan /bridge/ subject mapping.
  Transportation: ['road', 'highway', 'transit', 'transportation', 'motor vehicle', 'license plate', 'railroad', 'railway', 'vehicle registration', "driver's license", 'school bus', 'toll road', 'public transit', 'mass transit'],
  // Detected structurally from the title (isCeremonialResolution), never from body
  // keywords — a keyword list here would false-tag substantive bills. Intentionally empty.
  'Honors & Memorials': [],
};

/** Escape regex metacharacters in a keyword before embedding in a pattern. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The `Honors & Memorials` tag for ceremonial resolutions. */
const HONORS_MEMORIALS: KYTopicTag = 'Honors & Memorials';

/**
 * Ceremonial resolutions — honoring/congratulating a person or group, or
 * memorializing the deceased. Detected by title shape because these instruments
 * carry no policy content; matching body keywords only produces false tags
 * (SR35 2023, "honoring Congressman … upon his election", was mislabeled Voting
 * Rights off the word "election"). Mirrors the ceremonial half of the search
 * demotion (SEARCH_CEREMONIAL_RESOLUTION_RE in ky-search-bills.ts), widened to
 * the short LRC title forms ("Adjourn in honor and loving memory of …",
 * "Honor …", "Memorialize …") the classifier also sees.
 *
 * `designating`/appointment resolutions are deliberately excluded — those are
 * demoted in search but are not honors or memorials, so they fall through to
 * normal topic classification. Substantive ACTs are excluded too: a naming act
 * ("AN ACT relating to naming the … Armory in honor of Rep. …", HB467) carries
 * "in honor of" but has legal effect and a real policy topic (Veterans Affairs),
 * so it must keep keyword classification.
 */
const CEREMONIAL_LEAD_RE =
  /^(?:a\s+(?:joint\s+|concurrent\s+)?resolution\s+)?(?:honor(?:ing|s)?|recogniz(?:e|es|ing)|congratulat(?:e|es|ing)|commemorat(?:e|es|ing)|celebrat(?:e|es|ing)|mourn(?:s|ing)?|memorializ(?:e|es|ing))\b/i;
const IN_HONOR_OR_MEMORY_RE = /\bin\s+(?:loving\s+)?(?:honor|memory)\b/i;
const SUBSTANTIVE_ACT_RE = /^an\s+act\b/i;

export function isCeremonialResolution(title: string | null | undefined): boolean {
  const t = (title ?? '').trim();
  if (!t) return false;
  if (SUBSTANTIVE_ACT_RE.test(t)) return false;
  return CEREMONIAL_LEAD_RE.test(t) || IN_HONOR_OR_MEMORY_RE.test(t);
}

/**
 * Procedural boilerplate stripped before keyword matching. Each pattern was measured to
 * misfire a topic keyword corpus-wide (2026-07-05, Judiciary rollout): committee-referral
 * clauses in study resolutions (11/39 'judiciary' hits), interstate-compact separation-of-powers
 * language (11/241 'judicial' hits), and federal-court contingency clauses (3/105 'supreme
 * court' hits). Stripping the phrase keeps the keyword's genuine signal — the alternative,
 * deleting the keyword, is only right when most hits are noise (cf. the removed bare 'emergency').
 */
const BOILERPLATE_PATTERNS: RegExp[] = [
  /\b(?:interim joint )?committee on (?:the )?judiciary\b/gi,
  /\b(?:united states|u\.s\.) supreme court\b/gi,
  /\b(?:executive|legislative|judicial)(?:,| and)? (?:executive|legislative|judicial),? and (?:executive|legislative|judicial) branch(?:es)?\b/gi,
];

function stripBoilerplate(text: string): string {
  return BOILERPLATE_PATTERNS.reduce((t, re) => t.replace(re, ' '), text);
}

/** Compiled word-boundary regex cache, built once at module load. */
const TOPIC_KEYWORD_REGEXES: { topic: KYTopicTag; keyword: string; regex: RegExp }[] =
  (Object.entries(TOPIC_KEYWORDS) as [KYTopicTag, string[]][]).flatMap(([topic, keywords]) =>
    keywords.map(keyword => ({
      topic,
      keyword,
      regex: new RegExp(String.raw`\b${escapeRegex(keyword)}\b`, 'i'),
    })),
  );

/**
 * Classify content into Kentucky topic tags using word-boundary keyword matching.
 * Returns matched topics sorted by relevance (number of keyword hits).
 */
export function classifyTopics(title: string, description: string): string[] {
  // Ceremonial resolutions get the single structural tag and skip keyword
  // matching entirely — their body words (a district, a profession, "election")
  // describe the honoree, not a policy area the resolution addresses.
  if (isCeremonialResolution(title)) return [HONORS_MEMORIALS];

  const text = stripBoilerplate(`${title} ${description}`);
  const hitsByTopic = new Map<KYTopicTag, number>();

  for (const { topic, regex } of TOPIC_KEYWORD_REGEXES) {
    if (regex.test(text)) {
      hitsByTopic.set(topic, (hitsByTopic.get(topic) ?? 0) + 1);
    }
  }

  const scores = Array.from(hitsByTopic, ([topic, hits]) => ({ topic, hits }));

  // Sort by number of keyword hits descending
  scores.sort((a, b) => b.hits - a.hits);

  // Return top matches (at least 1 hit), max 4 topics
  const matched = scores.slice(0, 4).map(s => s.topic);

  return matched;
}

/**
 * Debug helper: returns every keyword→topic pair that matched the title.
 * Used by Wave 3 coverage checks to log exactly what matched.
 */
export function classifyTopicsForDebug(title: string): { keyword: string; topic: KYTopicTag }[] {
  const text = stripBoilerplate(title);
  return TOPIC_KEYWORD_REGEXES
    .filter(({ regex }) => regex.test(text))
    .map(({ keyword, topic }) => ({ keyword, topic }));
}

/**
 * AI-powered topic classification fallback for ambiguous items.
 * Only called when keyword matching returns no results.
 */
export async function classifyTopicsAI(title: string, description: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return [];
  }
  try {
    const anthropic = new Anthropic();
    const validTopics = KY_TOPICS.join(', ');
    const message = await anthropic.messages.create({
      model: KY_DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 100,
      system: `You classify Kentucky civic content into topics. Return ONLY a comma-separated list of 1-4 topics from this list: ${validTopics}. No other text.`,
      messages: [{
        role: 'user',
        content: `Title: ${title}\nDescription: ${description || 'N/A'}`,
      }],
    });
    const block = message.content[0];
    if (block.type !== 'text') return [];
    return block.text
      .split(',')
      .map(t => t.trim())
      .filter(t => (KY_TOPICS as readonly string[]).includes(t));
  } catch (err: any) {
    console.error('[KY-TopicClassifier] AI fallback error:', err?.message ?? err);
    return [];
  }
}

/**
 * Smart classifier: tries keyword matching first, falls back to AI for ambiguous items.
 */
export async function classifyTopicsSmart(title: string, description: string): Promise<string[]> {
  const keywordResults = classifyTopics(title, description);
  if (keywordResults.length > 0) return keywordResults;
  return classifyTopicsAI(title, description);
}

