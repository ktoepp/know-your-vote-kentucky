import { KY_TOPICS, type KYTopicTag } from '@/lib/ky-topic-classifier';

/**
 * URL + copy helpers for the topic landing pages (/bills/topics/education).
 * Slugs derive from the fixed 22-tag taxonomy in `KY_TOPICS`; the reverse map
 * makes every slug statically enumerable for `generateStaticParams`.
 */

export function kyTopicSlug(tag: KYTopicTag): string {
  return tag
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const TOPIC_BY_SLUG: ReadonlyMap<string, KYTopicTag> = new Map(
  KY_TOPICS.map((tag) => [kyTopicSlug(tag), tag]),
);

export function kyTopicForSlug(raw: string): KYTopicTag | null {
  return TOPIC_BY_SLUG.get((raw || '').trim().toLowerCase()) ?? null;
}

export function kyTopicPath(tag: KYTopicTag): string {
  return `/bills/topics/${kyTopicSlug(tag)}`;
}

/** Lowercased tag for mid-sentence use ("Kentucky education bills"). */
export function kyTopicPhrase(tag: KYTopicTag): string {
  return tag.toLowerCase();
}

/**
 * One-sentence scope intro per topic — neutral, factual, written from the
 * classifier's keyword scope (src/lib/ky-topic-classifier.ts). Shown on the
 * topic page and index; always paired with the automated-tagging disclosure.
 */
export const KY_TOPIC_INTROS: Record<KYTopicTag, string> = {
  Education:
    'Bills tagged Education cover public schools, students, teachers, curriculum, and school funding.',
  Healthcare:
    'Bills tagged Healthcare cover hospitals, health insurance, Medicaid, prescription drugs, and licensed health professions.',
  Infrastructure:
    'Bills tagged Infrastructure cover water and sewer systems, broadband, dams, and other public works.',
  Taxation:
    'Bills tagged Taxation cover state and local taxes, revenue measures, levies, and assessments.',
  'Public Safety':
    'Bills tagged Public Safety cover law enforcement, fire and emergency services, and disaster response.',
  Environment:
    'Bills tagged Environment cover conservation, pollution, water and air quality, wildlife, and waste.',
  Labor:
    'Bills tagged Labor cover wages, employers and employees, unions, unemployment, and workforce programs.',
  Housing:
    'Bills tagged Housing cover rental housing, landlords and tenants, zoning, and homeownership.',
  Agriculture:
    'Bills tagged Agriculture cover farming, livestock, crops, hemp, and rural development.',
  Energy:
    'Bills tagged Energy cover utilities, coal, natural gas, and renewable power.',
  'Criminal Justice':
    'Bills tagged Criminal Justice cover offenses, sentencing, parole and probation, and expungement.',
  Judiciary:
    "Bills tagged Judiciary cover Kentucky's courts, judges, and the Court of Justice.",
  'Voting Rights':
    'Bills tagged Voting Rights cover voter registration, ballots, and redistricting.',
  'Local Government':
    'Bills tagged Local Government cover counties, cities, fiscal courts, and special districts.',
  Budget:
    'Bills tagged Budget cover appropriations, state spending, pensions, and bonds.',
  Corrections:
    'Bills tagged Corrections cover the Department of Corrections, correctional facilities, and reentry.',
  Elections:
    'Bills tagged Elections cover election administration, county clerks, precincts, and voting equipment.',
  'Higher Education':
    'Bills tagged Higher Education cover public universities, the Kentucky Community and Technical College System (KCTCS), and postsecondary programs.',
  'Veterans Affairs':
    'Bills tagged Veterans Affairs cover veterans, servicemembers, the National Guard, and military benefits.',
  'Alcohol & Cannabis':
    'Bills tagged Alcohol & Cannabis cover alcoholic beverage licensing, distilleries, cannabis, and hemp-derived products.',
  Gambling:
    'Bills tagged Gambling cover sports wagering, the lottery, horse racing, and charitable gaming.',
  Transportation:
    'Bills tagged Transportation cover roads and highways, motor vehicles, licensing, and public transit.',
};

/** Voice-and-tone mandated disclosure — shown wherever automated tags drive a list. */
export const KY_TOPIC_TAGGING_DISCLOSURE =
  'Topic tags are automated and can miss or mislabel some bills.';
