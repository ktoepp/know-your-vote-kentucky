import React from 'react';
import {
  formatMemberDisplay,
  kyLegislatureProfileUrl,
  type MemberDisplayInput,
  type MemberDisplayVariant,
} from '@/lib/ky-member-utils';

export interface MemberNameProps {
  member: MemberDisplayInput;
  /** Display variant from UX §2c. Defaults to `"primary"`. */
  variant?: MemberDisplayVariant;
  /**
   * Link the rendered name to the KY Legislature profile when available.
   * Opt-in — existing sites that already wrap the name in a link should leave this unset.
   */
  link?: boolean;
}

/** Canonical member-name renderer — wraps `formatMemberDisplay` (UX §2b). */
export function MemberName({ member, variant = 'primary', link = false }: MemberNameProps) {
  const text = formatMemberDisplay(member, variant);
  const profileUrl = link ? kyLegislatureProfileUrl(member) : null;
  if (profileUrl) {
    return (
      <a href={profileUrl} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  }
  return <>{text}</>;
}

