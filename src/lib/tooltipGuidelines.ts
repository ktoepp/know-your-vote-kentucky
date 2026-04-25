// Tooltip Usage Guidelines for Know Your Vote Kentucky
// This file provides guidance on when and how to add educational tooltips

import { governmentTooltips } from './tooltipContent';

export const tooltipGuidelines = {
  // Terms that should ALWAYS have tooltips
  required: [
    "Kentucky General Assembly terminology (committee, markup, LRC, General Assembly)",
    "Legislative process steps (introduced, engrossed, enrolled, adjourned sine die)",
    "Voting types (roll call, voice vote, amendment)",
    "KY-specific procedures (committee substitute, posted for passage, recommitted)",
    "Legislative roles (sponsor, cosponsor, whip)",
    "Document types (conference report, fiscal note, emergency clause)",
    "Procedural terms (quorum, unanimous consent, discharge petition)"
  ],
  
  // Terms that can optionally have tooltips
  optional: [
    "Common political terms that might be unfamiliar to young adults",
    "Abbreviations and acronyms (H.R., S., etc.)",
    "Historical context for current events",
    "State/district abbreviations",
    "Party affiliation explanations"
  ],
  
  // Terms that should NOT have tooltips
  avoid: [
    "Basic terms most adults know (vote, law, bill)",
    "Terms that are clearly explained in surrounding text",
    "Every single political word (avoid tooltip overload)",
    "Obvious UI elements (buttons, links)",
    "Common English words used in political context"
  ]
};

// Examples of good tooltip usage
export const tooltipExamples = {
  good: [
    {
      term: "committee",
      context: "In a bill card showing committee assignment",
      tooltip: "A smaller group of legislators who specialize in a specific policy area..."
    },
    {
      term: "engrossed",
      context: "In a bill status chip",
      tooltip: "The bill passed one chamber and has been printed in its final form..."
    },
    {
      term: "adjourned sine die",
      context: "In a session status banner",
      tooltip: "The legislative session has officially ended; any unpassed bills are dead until next session..."
    }
  ],
  
  avoid: [
    {
      term: "vote",
      reason: "Too basic - everyone knows what voting means"
    },
    {
      term: "law",
      reason: "Common English word that doesn't need explanation"
    },
    {
      term: "congress",
      reason: "Basic term that most users understand"
    }
  ]
};

// Accessibility considerations
export const accessibilityGuidelines = {
  keyboard: "Tooltips should be accessible via keyboard navigation (Tab, Enter, Escape)",
  screenReaders: "Use proper ARIA attributes (role='tooltip', aria-describedby)",
  focus: "Tooltips should not interfere with normal tab order",
  timing: "Use appropriate delays (300ms) to avoid accidental triggering",
  contrast: "Ensure sufficient color contrast for tooltip text and backgrounds",
  motion: "Respect user's motion preferences (prefers-reduced-motion)"
};

// Content guidelines
export const contentGuidelines = {
  tone: "Respectful and educational, not condescending",
  length: "Keep explanations concise but informative (1-2 sentences)",
  language: "Use clear, accessible language suitable for young adults",
  examples: "Include real-world analogies when helpful",
  context: "Consider current political context when relevant",
  accuracy: "Ensure all explanations are factually correct"
};

// Implementation patterns
export const implementationPatterns = {
  // Simple term tooltip
  simple: `
    <Tooltip content={governmentTooltips.committee.content}>
      <span className="underline decoration-dotted cursor-help">
        Committee
      </span>
    </Tooltip>
  `,
  
  // Contextual tooltip with current session context
  contextual: `
    <ContextualTooltip
      term="committee_substitute"
      context="The Education Committee replaced the original bill text before reporting it"
    >
      Committee Substitute
    </ContextualTooltip>
  `,

  // Complex tooltip with expandable details
  complex: `
    <ComplexTooltip
      title="Veto Override"
      summary="The General Assembly can override a Governor veto with 3/5 of elected members."
      details={[
        "Requires 61 of 100 House members (elected, not just present)",
        "Requires 23 of 38 Senate members",
        "Both chambers must vote to override"
      ]}
    >
      Veto Override
    </ComplexTooltip>
  `
};

// Helper function to check if a term should have a tooltip
export const shouldHaveTooltip = (term: string): boolean => {
  const lowerTerm = term.toLowerCase();
  
  // Check if it's in the avoid list
  if (tooltipGuidelines.avoid.some(avoidTerm => 
    lowerTerm.includes(avoidTerm.toLowerCase())
  )) {
    return false;
  }
  
  // Check if it's in the required list
  if (tooltipGuidelines.required.some(requiredTerm => 
    lowerTerm.includes(requiredTerm.toLowerCase())
  )) {
    return true;
  }
  
  // Check if it's in the optional list
  if (tooltipGuidelines.optional.some(optionalTerm => 
    lowerTerm.includes(optionalTerm.toLowerCase())
  )) {
    return true;
  }
  
  return false;
};

// Helper function to get appropriate tooltip content
export const getAppropriateTooltip = (term: string, context?: string) => {
  const tooltipContent = governmentTooltips[term];
  
  if (!tooltipContent) {
    return null;
  }
  
  // If context is provided, use contextual tooltip
  if (context) {
    return {
      type: 'contextual',
      content: tooltipContent,
      context
    };
  }
  
  // Check if this term needs complex explanation
  const complexTerms = ['veto_override', 'emergency_clause', 'adjourned_sine_die'];
  if (complexTerms.includes(term)) {
    return {
      type: 'complex',
      content: tooltipContent
    };
  }
  
  // Default to simple tooltip
  return {
    type: 'simple',
    content: tooltipContent
  };
}; 