/**
 * LegiScan data is licensed CC BY 4.0. The license requires, wherever the data
 * is shown or redistributed: credit to LegiScan, the license name with a link,
 * and a note when the data was changed. LegiScan audits this from 2026-11-01
 * and permanently bans non-compliant API keys, so every surface that shows or
 * serves LegiScan-derived data takes its wording from here.
 *
 * Copy follows docs/voice-and-tone.md: naming a public source is allowed, no
 * em dashes, no semicolons.
 */
export const LEGISCAN_URL = 'https://legiscan.com';
export const CC_BY_4_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const CC_BY_4_NAME = 'CC BY 4.0';

/** What we change, for the "indicate if changes were made" requirement. */
export const LEGISCAN_CHANGES_NOTE =
  'We reformat it, add plain-language status labels and topics, and write AI summaries.';

/** One-line credit for footers and emails (plain text form). */
export const LEGISCAN_CREDIT_TEXT = `Bill, vote and sponsor data from LegiScan (${LEGISCAN_URL}), licensed under ${CC_BY_4_NAME} (${CC_BY_4_URL}). ${LEGISCAN_CHANGES_NOTE}`;

/** Machine-readable attribution for JSON API responses. */
export const LEGISCAN_API_ATTRIBUTION = {
  source: 'LegiScan',
  source_url: LEGISCAN_URL,
  license: CC_BY_4_NAME,
  license_url: CC_BY_4_URL,
  changes: LEGISCAN_CHANGES_NOTE,
} as const;
