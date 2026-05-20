/**
 * Map Kentucky internal topics (`KY_TOPICS`, the 20-category bucket users follow
 * in their notification preferences) to LegiScan official subject patterns.
 *
 * Why this exists: the digest cron filters bills by `ky_bills.topics`, which is
 * populated by a heuristic keyword classifier. Bills can have a relevant
 * LegiScan subject (e.g., MEDICAID) without ever being tagged with the
 * matching internal topic (Healthcare). Without a bridge, a "Healthcare"
 * follower would silently miss those bills. This mapping is the bridge.
 *
 * Maintenance: run `npm run audit:legiscan-subjects` periodically (the weekly
 * GH workflow does it for us) to surface unmapped subjects sorted by frequency
 * — those are candidates to add here. New LegiScan subjects appear rarely.
 */
import { KY_TOPICS, type KYTopicTag } from './ky-topic-classifier';

/** Match against LegiScan `subject_name`, case-insensitive substring or regex. */
type SubjectPattern = string | RegExp;

const TOPIC_TO_SUBJECT_PATTERNS: Record<KYTopicTag, SubjectPattern[]> = {
  Education: [
    /school/i,
    /education/i,
    /\bteacher/i,
    /\bstudent/i,
    /curriculum/i,
    /literacy/i,
  ],
  Healthcare: [
    /health/i,
    /medicaid/i,
    /medicare/i,
    /\bhospital/i,
    /\binsurance\b/i,
    /\bmental health/i,
    /\bpharmacy|pharmacist|drug pricing/i,
    /\bnurs(e|ing)/i,
    /\bphysician|doctor/i,
    /opioid|substance abuse|addiction/i,
  ],
  Infrastructure: [
    /transportation/i,
    /highway|road|bridge/i,
    /\bwater\b|sewer|wastewater/i,
    /broadband|telecommunication/i,
    /\btransit\b/i,
    /\bdam\b/i,
  ],
  Taxation: [/\btax(es|ation|ing)?\b/i, /\brevenue\b/i, /assessment/i, /\bfiscal\b/i, /\blevy\b/i],
  'Public Safety': [
    /\bpolice|law enforcement/i,
    /\bfire (service|department|protection)/i,
    /emergency management|emergency services/i,
    /\bsheriff/i,
    /\bems\b|emergency medical/i,
    /disaster|flood/i,
    /\b911\b/i,
  ],
  Environment: [
    /environment/i,
    /pollution/i,
    /clean (air|water)/i,
    /climate/i,
    /conservation/i,
    /wildlife/i,
    /recycling|solid waste/i,
    /coal ash/i,
  ],
  Labor: [
    /labor/i,
    /\bworker(s'?)?( compensation)?/i,
    /employment/i,
    /\bunion\b/i,
    /workforce/i,
    /unemployment/i,
    /minimum wage|wage and hour/i,
    /workplace safety/i,
  ],
  Housing: [
    /housing/i,
    /landlord|tenant/i,
    /eviction/i,
    /homeless/i,
    /\bzoning\b/i,
    /mortgage/i,
    /\brent\b/i,
  ],
  Agriculture: [
    /agriculture|agricultural/i,
    /\bfarm/i,
    /livestock/i,
    /\bcrop/i,
    /tobacco/i,
    /bourbon|distillery/i,
    /\bhemp\b/i,
    /\brural\b/i,
  ],
  Energy: [
    /\benergy\b/i,
    /\bcoal\b/i,
    /natural gas/i,
    /\bsolar\b|\bwind\b|renewable/i,
    /\butility|utilities\b/i,
    /\belectric/i,
    /pipeline/i,
    /power plant/i,
  ],
  'Criminal Justice': [
    /criminal/i,
    /\bcrime/i,
    /\bsentencing/i,
    /\bparole|probation/i,
    /\bfelony|misdemeanor/i,
    /incarcerat/i,
    /\bjuvenile justice/i,
    /expungement/i,
  ],
  'Voting Rights': [
    /\bvot(ing|er|e)\b/i,
    /\belection law|election integrity/i,
    /\bballot/i,
    /\bregistration\b.*\bvoter|voter.*registration/i,
    /redistricting|reapportionment/i,
    /absentee/i,
  ],
  'Local Government': [
    /local government/i,
    /\bcount(y|ies)\b/i,
    /\bcity\b|municipal/i,
    /metro council|fiscal court/i,
    /\bordinance/i,
    /annexation/i,
    /planning commission|zoning board/i,
    /special district|library district/i,
    /louisville metro|lexington-fayette/i,
  ],
  Budget: [
    /\bbudget/i,
    /appropriation/i,
    /general fund/i,
    /pension|retirement system/i,
    /\bbond(s)?\b/i,
    /\bdeficit|surplus\b/i,
  ],
  Corrections: [
    /\bcorrections?\b/i,
    /\binmate|prisoner/i,
    /correctional facility|department of corrections/i,
    /reentry|reintegration/i,
    /parole board/i,
  ],
  Elections: [
    /election administration|election official/i,
    /\bcounty clerk\b/i,
    /poll worker|polling place|polling location/i,
    /voting machine|voting equipment/i,
    /\bcanvass/i,
    /secretary of state/i,
    /election board|board of elections/i,
    /\bprecinct/i,
  ],
  'Higher Education': [
    /higher education/i,
    /postsecondary/i,
    /\bkctcs\b/i,
    /board of regents/i,
    /state university|community college|technical college/i,
    /tuition/i,
  ],
  'Veterans Affairs': [
    /\bveteran/i,
    /\bmilitary\b/i,
    /national guard/i,
    /armed forces/i,
    /servicemember/i,
    /veterans benefits|veterans affairs/i,
  ],
  'Alcohol & Cannabis': [
    /\balcohol|alcoholic beverage/i,
    /\bliquor|distillery|brewery/i,
    /wet[- ]dry/i,
    /cannabis|marijuana|hemp/i,
    /\bthc\b|delta-8/i,
  ],
  Gambling: [
    /gambling|gaming/i,
    /\bcasino/i,
    /sports betting|sports wagering/i,
    /\blottery/i,
    /pari-?mutuel|horse racing/i,
    /charitable gaming/i,
  ],
};

/** Pre-built lookup for fast subject → topic resolution. */
const PATTERN_INDEX: Array<{ topic: KYTopicTag; matcher: (subject: string) => boolean }> = [];
for (const topic of KY_TOPICS) {
  for (const pattern of TOPIC_TO_SUBJECT_PATTERNS[topic]) {
    if (typeof pattern === 'string') {
      const needle = pattern.toLowerCase();
      PATTERN_INDEX.push({ topic, matcher: (s) => s.toLowerCase().includes(needle) });
    } else {
      PATTERN_INDEX.push({ topic, matcher: (s) => pattern.test(s) });
    }
  }
}

/** Return all KY topics that match a single LegiScan subject name. */
export function topicsForLegiScanSubject(subjectName: string): KYTopicTag[] {
  const out = new Set<KYTopicTag>();
  for (const entry of PATTERN_INDEX) {
    if (entry.matcher(subjectName)) out.add(entry.topic);
  }
  return Array.from(out);
}

type LegiScanSubjectLike = { subject_name?: string | null } | string;

/** Return all KY topics implied by a bill's `legiscan_subjects` JSONB array. */
export function topicsForLegiScanSubjects(
  subjects: LegiScanSubjectLike[] | null | undefined,
): KYTopicTag[] {
  if (!Array.isArray(subjects) || subjects.length === 0) return [];
  const out = new Set<KYTopicTag>();
  for (const s of subjects) {
    const name = typeof s === 'string' ? s : (s?.subject_name ?? '');
    if (!name.trim()) continue;
    for (const t of topicsForLegiScanSubject(name)) out.add(t);
  }
  return Array.from(out);
}

/**
 * Return which of the user's topic filters a bill matches (via its KY topics OR its
 * LegiScan subjects). Used to tell digest readers *why* a topic-followed bill is included.
 */
export function matchedTopicFilters(
  billTopics: string[] | null | undefined,
  legiScanSubjects: LegiScanSubjectLike[] | null | undefined,
  userTopicFilters: string[],
): string[] {
  if (!userTopicFilters.length) return [];
  const filterSet = new Set(userTopicFilters);
  const matched = new Set<string>();
  for (const t of billTopics ?? []) {
    if (filterSet.has(t)) matched.add(t);
  }
  for (const t of topicsForLegiScanSubjects(legiScanSubjects)) {
    if (filterSet.has(t)) matched.add(t);
  }
  return Array.from(matched);
}

/** True when a bill (via its KY topics OR its LegiScan subjects) matches any of the user's topic filters. */
export function billMatchesTopicFilters(
  billTopics: string[] | null | undefined,
  legiScanSubjects: LegiScanSubjectLike[] | null | undefined,
  userTopicFilters: string[],
): boolean {
  return matchedTopicFilters(billTopics, legiScanSubjects, userTopicFilters).length > 0;
}

/** True when the supplied subject name matches at least one mapped topic. Used by the audit script. */
export function isLegiScanSubjectMapped(subjectName: string): boolean {
  return topicsForLegiScanSubject(subjectName).length > 0;
}
