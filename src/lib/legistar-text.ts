/**
 * Legistar API strings often include HTML entities (e.g. &nbsp;) and long runs of
 * ALL CAPS. Normalize for storage and display.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
};

function decodeNumericEntities(s: string): string {
  return s
    .replace(/&#(\d{1,7});/g, (m, code: string) => {
      const n = parseInt(code, 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, hex: string) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    });
}

function decodeNamedEntities(s: string): string {
  return s.replace(/&([a-z]+|#\d+);/gi, (m, name: string) => {
    const key = name.toLowerCase();
    if (NAMED_ENTITIES[key] !== undefined) return NAMED_ENTITIES[key];
    return m;
  });
}

function collapseWhitespace(s: string): string {
  return s.replace(/[\s\u00A0\uFEFF]+/g, ' ').trim();
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return '';
  let s = String(input);
  s = decodeNumericEntities(s);
  s = s.replace(/&nbsp;/gi, ' ');
  s = decodeNamedEntities(s);
  s = s.replace(/&amp;/g, '&');
  return collapseWhitespace(s);
}

/** True when the text is long enough and letter characters are overwhelmingly uppercase (Legistar shouting). */
export function isMostlyAllCaps(s: string): boolean {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 6) return false;
  const upper = [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
  return upper / letters.length >= 0.82;
}

/** Title-style casing for strings that are entirely Legistar-style caps. */
export function titleCaseFromShouting(s: string): string {
  const lower = s.toLowerCase();
  return lower.replace(/(^|[\s\-/([{"'`])([a-z])/g, (_m, sep: string, letter: string) => sep + letter.toUpperCase());
}

/**
 * Decode HTML entities, collapse whitespace, and convert obvious ALL CAPS Legistar copy
 * to readable title-style casing.
 */
export function normalizeLegistarOrdinanceText(input: string | null | undefined): string {
  if (input == null) return '';
  const decoded = decodeHtmlEntities(String(input));
  if (!decoded) return '';
  if (isMostlyAllCaps(decoded)) {
    return titleCaseFromShouting(decoded);
  }
  return decoded;
}
