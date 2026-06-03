/**
 * Kentucky Topic Classifier
 * Classifies civic content into Kentucky-specific topic taxonomy.
 * Uses keyword matching for speed with AI fallback for ambiguous items.
 */
import Anthropic from '@anthropic-ai/sdk';

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
  'Voting Rights',
  'Local Government',
  'Budget',
  'Corrections',
  'Elections',
  'Higher Education',
  'Veterans Affairs',
  'Alcohol & Cannabis',
  'Gambling',
] as const;

export type KYTopicTag = (typeof KY_TOPICS)[number];

/** Keyword map for fast classification */
const TOPIC_KEYWORDS: Record<KYTopicTag, string[]> = {
  Education: ['school', 'education', 'student', 'teacher', 'university', 'college', 'curriculum', 'tuition', 'charter', 'jcps', 'fcps', 'superintendent'],
  Healthcare: ['health', 'hospital', 'medicaid', 'medicare', 'insurance', 'mental health', 'opioid', 'drug', 'pharmacy', 'nurse', 'doctor', 'clinic'],
  Infrastructure: ['road', 'bridge', 'highway', 'water', 'sewer', 'broadband', 'internet', 'transit', 'transportation', 'construction', 'dam'],
  // 'fiscal' removed: it matches "fiscal court" (local gov) and "fiscal note/year/impact" boilerplate, not tax policy.
  Taxation: ['tax', 'revenue', 'property tax', 'sales tax', 'income tax', 'levy', 'assessment'],
  // Bare 'emergency'/'safety' removed: they match the "emergency clause"/"declares an emergency" boilerplate present
  // in many bills, and generic "safety". Use specific public-safety phrasing instead.
  'Public Safety': ['police', 'fire', 'emergency management', 'emergency services', 'first responder', 'state of emergency', 'public safety', 'crime', '911', 'sheriff', 'ems', 'disaster', 'flood'],
  Environment: ['environment', 'pollution', 'clean water', 'air quality', 'climate', 'conservation', 'wildlife', 'recycling', 'waste', 'coal ash'],
  Labor: ['worker', 'wage', 'employment', 'union', 'labor', 'workforce', 'unemployment', 'minimum wage', 'workplace'],
  Housing: ['housing', 'rent', 'affordable housing', 'zoning', 'landlord', 'tenant', 'homeless', 'eviction', 'mortgage'],
  Agriculture: ['farm', 'agriculture', 'crop', 'livestock', 'tobacco', 'bourbon', 'hemp', 'rural', 'usda'],
  Energy: ['energy', 'coal', 'natural gas', 'solar', 'wind', 'utility', 'electric', 'pipeline', 'power plant', 'renewable'],
  'Criminal Justice': ['prison', 'jail', 'sentencing', 'parole', 'probation', 'felony', 'misdemeanor', 'incarceration', 'juvenile', 'expungement'],
  'Voting Rights': ['voting', 'election', 'ballot', 'voter', 'registration', 'redistricting', 'poll', 'absentee', 'primary'],
  // Bare 'commissioner' removed: it matches state offices (Commissioner of Agriculture, Insurance Commissioner),
  // not local government. 'fiscal court' / 'magistrate' / 'county judge-executive' are the KY local-gov signals.
  'Local Government': ['county', 'city council', 'metro council', 'mayor', 'magistrate', 'county judge-executive', 'ordinance', 'municipal', 'annexation', 'fiscal court', 'planning commission', 'zoning board', 'louisville metro', 'lexington-fayette', 'special district', 'library district'],
  Budget: ['budget', 'appropriation', 'spending', 'deficit', 'surplus', 'general fund', 'pension', 'bond'],
  Corrections: ['department of corrections', 'corrections officer', 'inmate', 'warden', 'reentry', 'halfway house', 'correctional facility', 'parole board'],
  Elections: ['election administration', 'county clerk', 'poll worker', 'voting machine', 'canvass', 'secretary of state', 'election board', 'precinct', 'election official'],
  'Higher Education': ['higher education', 'postsecondary', 'kctcs', 'council on postsecondary', 'board of regents', 'state university', 'community and technical college'],
  'Veterans Affairs': ['veteran', 'veterans', 'military', 'national guard', 'gi bill', 'armed forces', 'servicemember', 'veterans affairs', 'veterans benefits'],
  'Alcohol & Cannabis': ['alcohol', 'liquor', 'distillery', 'brewery', 'wet-dry', 'cannabis', 'marijuana', 'medical marijuana', 'thc', 'delta-8'],
  Gambling: ['gambling', 'casino', 'sports betting', 'lottery', 'wagering', 'historical horse racing', 'pari-mutuel', 'charitable gaming', 'racing commission'],
};

/** Escape regex metacharacters in a keyword before embedding in a pattern. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const text = `${title} ${description}`;
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
  return TOPIC_KEYWORD_REGEXES
    .filter(({ regex }) => regex.test(title))
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
      model: 'claude-sonnet-4-20250514',
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

