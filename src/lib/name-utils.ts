/**
 * Utility functions for normalizing legislator/representative names.
 * Extracted from congressional-labels.ts for use in KY-specific components.
 */

/** Normalize a representative or senator name from "LastName, FirstName [Party-State]" format */
export function normalizeRepresentativeName(name: string): string {
  if (!name) return name;

  // Match pattern: Rep. LastName, FirstName [Party-State-District]
  const repPattern = /^Rep\.\s+([^,]+),\s+([^[]+)\s*\[([^\]]+)\]$/;
  const repMatch = name.match(repPattern);

  if (repMatch) {
    const [, lastName, firstName, partyStateDistrict] = repMatch;
    return `Rep. ${firstName.trim()} ${lastName.trim()} (${partyStateDistrict})`;
  }

  // Match pattern: Sen. LastName, FirstName [Party-State]
  const senPattern = /^Sen\.\s+([^,]+),\s+([^[]+)\s*\[([^\]]+)\]$/;
  const senMatch = name.match(senPattern);

  if (senMatch) {
    const [, lastName, firstName, partyState] = senMatch;
    return `Sen. ${firstName.trim()} ${lastName.trim()} (${partyState})`;
  }

  // Also handle senator names that already have parentheses for consistency
  const senParenthesesPattern = /^Sen\.\s+([^,]+),\s+([^(]+)\s*\(([^)]+)\)$/;
  const senParenthesesMatch = name.match(senParenthesesPattern);

  if (senParenthesesMatch) {
    const [, lastName, firstName, partyState] = senParenthesesMatch;
    return `Sen. ${firstName.trim()} ${lastName.trim()} (${partyState})`;
  }

  // Return original if no pattern matches
  return name;
}

/** Normalize an array of speaker names */
export function normalizeSpeakerNames(speakers: string[]): string[] {
  return speakers.map(speaker => normalizeRepresentativeName(speaker));
}

