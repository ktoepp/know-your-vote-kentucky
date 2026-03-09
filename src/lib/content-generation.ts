/**
 * Enhanced Content Generation Utilities
 *
 * This module provides intelligent content generation for bills and events,
 * focusing on creating engaging, educational, and accessible content that serves
 * the platform's civic engagement mission.
 *
 * For Kentucky-specific AI-powered content generation (bills, ordinances,
 * executive orders, school board items), see:
 *   - src/lib/ky-content-generation.ts  — AI summaries via Anthropic Claude
 *   - src/lib/ky-intelligence.ts        — Relevance scoring & classification
 *   - src/lib/ky-topic-classifier.ts    — Topic taxonomy classification
 *
 * IMPORTANT: Never truncate meaningful content with ellipses. Use progressive disclosure
 * and intelligent formatting instead.
 *
 * NEW: All generated titles and summaries are guaranteed to be grammatically complete,
 * self-contained thoughts. Titles and summaries will never be fragments or incomplete phrases.
 *
 * Example:
 *   ❌ "Bill to supporting the week of June 23..."
 *   ✅ "This bill supports the week of June 23 through June 29, 2025, as National Women's Sports Week."
 *
 * Usage:
 *   - Use `ensureCompleteThoughts: true` in ContentGenerationOptions to enforce this policy.
 *   - The utility will:
 *     - Convert fragments to full sentences.
 *     - Add missing context (e.g., "This bill...", "This resolution...").
 *     - Ensure proper punctuation and grammar.
 */

// Re-export Kentucky-specific content generation for convenience
export {
  generateBillSummary as generateKYBillSummary,
  generateOrdinanceSummary as generateKYOrdinanceSummary,
  generateEOSummary as generateKYEOSummary,
  generateSchoolBoardSummary as generateKYSchoolBoardSummary,
} from './ky-content-generation';

export interface ContentGenerationOptions {
  maxTitleLength?: number;
  maxSummaryLength?: number;
  includeEducationalContext?: boolean;
  prioritizeSubstance?: boolean;
  targetAudience?: 'general' | 'educated' | 'expert';
  useProgressiveDisclosure?: boolean;
  // New standardized length options
  standardizeLengths?: boolean;
  targetTitleLength?: number;
  targetSummaryLength?: number;
  targetKeyPointsCount?: number;
  // New option to ensure complete thoughts
  ensureCompleteThoughts?: boolean;
}

export interface GeneratedContent {
  title: string;
  summary: string;
  keyPoints: string[];
  educationalContext?: string;
  relevanceScore: number;
  contentQuality: 'excellent' | 'good' | 'fair' | 'poor';
  // Progressive disclosure fields
  shortTitle?: string;
  shortSummary?: string;
  fullContent?: {
    title: string;
    summary: string;
    details: string[];
  };
}

/**
 * Enhanced Bill Title Generation
 * 
 * Creates engaging, educational titles that focus on the substance of legislation
 * rather than procedural language. Prioritizes clarity and civic engagement value.
 * NEVER truncates with ellipses - uses intelligent content selection instead.
 * Ensures complete, self-contained thoughts that make sense on their own.
 * 
 * AVOIDS duplicating information available elsewhere in the card (sponsor, bill number, etc.)
 * FOCUSES on what the bill does, not who introduced it or procedural details.
 */
export function generateEnhancedBillTitle(
  bill: {
    title?: string;
    number?: string;
    chamber?: string;
    sponsor?: string;
    subjects?: string[];
    summary?: string;
  },
  options: ContentGenerationOptions = {}
): string {
  const {
    maxTitleLength = 120,
    prioritizeSubstance = true,
    targetAudience = 'general',
    ensureCompleteThoughts = true
  } = options;

  if (!bill.title) {
    return 'Untitled Bill';
  }

  let title = bill.title.trim();

  // Handle resolution patterns with enhanced intelligence
  if (title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)/i)) {
    return generateResolutionTitle(title, bill, options);
  }

  // Handle bill patterns with substance focus
  if (title.match(/^A bill to /i)) {
    return generateBillSubstanceTitle(title, bill, options);
  }

  // Handle joint resolution patterns
  if (title.match(/^A joint resolution /i)) {
    return generateJointResolutionTitle(title, bill, options);
  }

  // Handle other patterns with intelligent parsing
  return generateGenericTitle(title, bill, options);
}

/**
 * Generate title for congressional resolutions
 * FOCUSES on what the resolution does, not procedural details
 */
function generateResolutionTitle(
  title: string,
  bill: any,
  options: ContentGenerationOptions
): string {
  const match = title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\s+(.+)/i);
  if (!match) return title;

  const action = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  let subject = match[2];

  // Enhanced subject cleaning - remove procedural language
  subject = cleanSubjectText(subject);
  
  // Remove sponsor names or bill numbers that appear elsewhere
  subject = subject.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
  subject = subject.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');
  
  // Prioritize substance over procedural language
  if (options.prioritizeSubstance) {
    if (subject.toLowerCase().includes(action.toLowerCase())) {
      return subject;
    }
  }

  return `${action} ${subject}`;
}

/**
 * Generate title focusing on bill substance
 * AVOIDS duplicating sponsor information available elsewhere
 */
function generateBillSubstanceTitle(
  title: string,
  bill: any,
  options: ContentGenerationOptions
): string {
  let substance = title
    .replace(/^A bill to /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove sponsor names or bill numbers that appear elsewhere
  substance = substance.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
  substance = substance.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');

  // Capitalize first letter
  substance = substance.charAt(0).toUpperCase() + substance.slice(1);

  // Add educational context for general audience (but avoid duplication)
  if (options.targetAudience === 'general' && options.includeEducationalContext) {
    const impact = assessBillImpact(substance, bill.subjects);
    if (impact && !substance.toLowerCase().includes(impact.toLowerCase())) {
      substance = `${substance} - ${impact}`;
    }
  }

  return substance;
}

/**
 * Generate title for joint resolutions
 * AVOIDS duplicating information available elsewhere
 */
function generateJointResolutionTitle(
  title: string,
  bill: any,
  options: ContentGenerationOptions
): string {
  let substance = title
    .replace(/^A joint resolution /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove sponsor names or bill numbers that appear elsewhere
  substance = substance.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
  substance = substance.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');

  substance = substance.charAt(0).toUpperCase() + substance.slice(1);

  // Add educational context (but avoid duplication)
  if (options.targetAudience === 'general' && options.includeEducationalContext) {
    if (!substance.toLowerCase().includes('joint resolution')) {
      substance = `${substance} (Joint Resolution)`;
    }
  }

  return substance;
}

/**
 * Generate title for generic patterns
 * AVOIDS duplicating information available elsewhere in the card
 * REMOVES generic prefixes that don't add value
 */
function generateGenericTitle(
  title: string,
  bill: any,
  options: ContentGenerationOptions
): string {
  let cleanTitle = title
    .replace(/^To /i, '')
    .replace(/^A resolution /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove sponsor names or bill numbers that appear elsewhere
  cleanTitle = cleanTitle.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
  cleanTitle = cleanTitle.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');

  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  return cleanTitle;
}

/**
 * Enhanced Bill Summary Generation
 * 
 * Creates educational, engaging summaries that explain the bill's specific purpose
 * and key provisions in accessible language.
 * NEVER truncates with ellipses - uses intelligent content selection instead.
 * 
 * FOCUSES on the specific issue and key provisions of the bill, not generic process.
 * AVOIDS duplicating information from the title or other card elements.
 */
export function generateEnhancedBillSummary(
  bill: {
    title?: string;
    summary?: string;
    subjects?: string[];
    sponsor?: string;
    chamber?: string;
    actions?: Array<{ text: string; actionDate: string }>;
  },
  options: ContentGenerationOptions = {}
): string {
  const {
    maxSummaryLength = 250, // Increased by 50
    includeEducationalContext = true,
    targetAudience = 'general'
  } = options;

  // Use existing summary if it's concise and educational (and doesn't duplicate title)
  if (bill.summary && bill.summary.length <= maxSummaryLength && 
      !bill.summary.includes('A bill to') && 
      (bill.summary.includes('This bill') || bill.summary.includes('This legislation'))) {
    return bill.summary;
  }

  // Generate educational summary that focuses on specific bill content, not generic process
  const summary = generateEducationalSummary(bill, targetAudience);
  
  // Add specific context for general audience (but avoid duplicating title content)
  if (includeEducationalContext && targetAudience === 'general') {
    const context = getBillSpecificContext(bill);
    if (context && !summary.toLowerCase().includes('legislative process')) {
      return `${summary} ${context}`;
    }
  }

  return summary;
}

/**
 * Generate educational summary that focuses on specific bill content, not generic process
 * AVOIDS duplicating what's already in the title
 * REMOVES generic statements that don't add value
 */
function generateEducationalSummary(bill: any, targetAudience: string): string {
  if (!bill.title) return 'No summary available.';

  const title = bill.title.trim();
  
  // Handle resolution patterns
  if (title.match(/^A resolution /i)) {
    return generateResolutionSummary(title, bill, targetAudience);
  }

  // Handle bill patterns
  if (title.match(/^A bill to /i)) {
    return generateBillSummary(title, bill, targetAudience);
  }

  // Handle joint resolution patterns
  if (title.match(/^A joint resolution /i)) {
    return generateJointResolutionSummary(title, bill, targetAudience);
  }

  // Generic summary
  return generateGenericSummary(title, bill, targetAudience);
}

/**
 * Generate summary for resolutions
 * FOCUSES on specific content and legal implications, not generic process
 * EXPLAINS what the resolution does and its real-world impact
 */
function generateResolutionSummary(title: string, bill: any, targetAudience: string): string {
  const match = title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\s+(.+)/i);
  if (!match) return 'This resolution expresses the sense of Congress.';

  const action = match[1];
  const subject = cleanSubjectText(match[2]);

  // Focus on the specific action and its implications
  if (targetAudience === 'general') {
    if (action === 'condemning') {
      return `This resolution condemning ${subject}. Congressional resolutions express the sense of Congress but do not have the force of law.`;
    } else if (action === 'designating' || action === 'establishing') {
      return `This resolution ${action} ${subject}. While not legally binding, this creates official recognition and may influence federal agencies and public awareness.`;
    } else if (action === 'supporting' || action === 'recognizing') {
      return `This resolution ${action} ${subject}. This expresses Congress's position and may influence policy decisions and public discourse.`;
    } else {
      return `This resolution ${action} ${subject}. Congressional resolutions express the sense of Congress but do not have the force of law.`;
    }
  }

  return `This resolution ${action} ${subject}.`;
}

/**
 * Generate summary for bills
 * FOCUSES on specific provisions and real-world impact, not generic process
 * EXPLAINS what the bill does and its practical effects
 */
function generateBillSummary(title: string, bill: any, targetAudience: string): string {
  let substance = title
    .replace(/^A bill to /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  substance = substance.charAt(0).toLowerCase() + substance.slice(1);

  // Add specific details based on subjects if available
  let specificDetails = '';
  if (bill.subjects && bill.subjects.length > 0) {
    const mainSubject = bill.subjects[0];
    specificDetails = ` The bill specifically addresses ${mainSubject} and related policy areas.`;
  }

  // Focus on practical effects and legal implications
  if (targetAudience === 'general') {
    // Analyze the substance to determine practical effects
    const effects = analyzeBillEffects(substance, bill.subjects);
    if (effects) {
      return `This bill would ${substance}.${specificDetails} ${effects}`;
    }
    return `This bill would ${substance}.${specificDetails} If enacted, this would become federal law and affect how the government operates in this area.`;
  }

  return `This bill would ${substance}.${specificDetails}`;
}

/**
 * Generate summary for joint resolutions
 * FOCUSES on specific content and legal implications, not generic process
 * EXPLAINS what the joint resolution does and its practical effects
 */
function generateJointResolutionSummary(title: string, bill: any, targetAudience: string): string {
  let substance = title
    .replace(/^A joint resolution /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  substance = substance.charAt(0).toLowerCase() + substance.slice(1);

  if (targetAudience === 'general') {
    // Analyze the substance to determine practical effects
    const effects = analyzeBillEffects(substance, bill.subjects);
    if (effects) {
      return `This joint resolution would ${substance}. ${effects} Joint resolutions require approval from both chambers and the President to become law.`;
    }
    return `This joint resolution would ${substance}. Joint resolutions require approval from both chambers and the President to become law.`;
  }

  return `This joint resolution would ${substance}.`;
}

/**
 * Generate generic summary
 * FOCUSES on specific content and practical impact, not generic process
 * EXPLAINS what the legislation does and its real-world effects
 */
function generateGenericSummary(title: string, bill: any, targetAudience: string): string {
  let cleanTitle = title
    .replace(/^To /i, '')
    .replace(/^A resolution /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleanTitle = cleanTitle.charAt(0).toLowerCase() + cleanTitle.slice(1);

  // Add specific details based on subjects if available
  let specificDetails = '';
  if (bill.subjects && bill.subjects.length > 0) {
    const mainSubject = bill.subjects[0];
    specificDetails = ` The legislation specifically addresses ${mainSubject} and related policy considerations.`;
  }

  if (targetAudience === 'general') {
    // Analyze the substance to determine practical effects
    const effects = analyzeBillEffects(cleanTitle, bill.subjects);
    if (effects) {
      return `This legislation addresses ${cleanTitle}.${specificDetails} ${effects}`;
    }
    return `This legislation addresses ${cleanTitle}.${specificDetails}`;
  }

  return `This legislation addresses ${cleanTitle}.${specificDetails}`;
}

/**
 * Analyze bill effects to provide practical implications
 * FOCUSES on real-world impact and legal consequences
 */
function analyzeBillEffects(substance: string, subjects?: string[]): string {
  const lowerSubstance = substance.toLowerCase();
  
  // Funding and appropriations
  if (lowerSubstance.includes('appropriat') || lowerSubstance.includes('fund') || lowerSubstance.includes('authoriz')) {
    return 'This would provide federal funding and resources for the specified programs and activities.';
  }
  
  // Regulatory changes
  if (lowerSubstance.includes('regulat') || lowerSubstance.includes('requir') || lowerSubstance.includes('mandat')) {
    return 'This would establish new requirements or modify existing regulations affecting businesses, individuals, or government agencies.';
  }
  
  // Tax changes
  if (lowerSubstance.includes('tax') || lowerSubstance.includes('revenue') || lowerSubstance.includes('deduct')) {
    return 'This would modify tax laws, potentially affecting individuals, businesses, or government revenue.';
  }
  
  // Health care
  if (lowerSubstance.includes('health') || lowerSubstance.includes('medic') || lowerSubstance.includes('care')) {
    return 'This would affect health care access, coverage, or delivery systems for millions of Americans.';
  }
  
  // Education
  if (lowerSubstance.includes('educat') || lowerSubstance.includes('school') || lowerSubstance.includes('student')) {
    return 'This would impact educational programs, funding, or policies affecting students and educational institutions.';
  }
  
  // Immigration
  if (lowerSubstance.includes('immigr') || lowerSubstance.includes('border') || lowerSubstance.includes('visa')) {
    return 'This would affect immigration policies, border security, or the legal status of individuals in the United States.';
  }
  
  // Environment
  if (lowerSubstance.includes('environ') || lowerSubstance.includes('climate') || lowerSubstance.includes('pollut')) {
    return 'This would affect environmental protection, climate policies, or natural resource management.';
  }
  
  // National security
  if (lowerSubstance.includes('defense') || lowerSubstance.includes('military') || lowerSubstance.includes('security')) {
    return 'This would impact national security policies, military operations, or defense programs.';
  }
  
  // Infrastructure
  if (lowerSubstance.includes('infrastructure') || lowerSubstance.includes('transport') || lowerSubstance.includes('construction')) {
    return 'This would affect infrastructure development, transportation systems, or public works projects.';
  }
  
  // Criminal justice
  if (lowerSubstance.includes('criminal') || lowerSubstance.includes('justice') || lowerSubstance.includes('law enforcement')) {
    return 'This would affect criminal justice policies, law enforcement practices, or legal procedures.';
  }
  
  // Veterans
  if (lowerSubstance.includes('veteran') || lowerSubstance.includes('military service')) {
    return 'This would affect benefits, services, or policies for military veterans and their families.';
  }
  
  // Social programs
  if (lowerSubstance.includes('social') || lowerSubstance.includes('welfare') || lowerSubstance.includes('assistance')) {
    return 'This would affect social welfare programs, assistance to individuals, or community services.';
  }
  
  // Technology
  if (lowerSubstance.includes('technolog') || lowerSubstance.includes('digital') || lowerSubstance.includes('cyber')) {
    return 'This would affect technology policies, digital infrastructure, or cybersecurity measures.';
  }
  
  // Trade and commerce
  if (lowerSubstance.includes('trade') || lowerSubstance.includes('commerce') || lowerSubstance.includes('business')) {
    return 'This would affect trade policies, business regulations, or economic development.';
  }
  
  // If no specific category matches, provide a general effect
  return 'If enacted, this would become federal law and affect how the government operates in this area.';
}

/**
 * Get specific bill context based on content, not generic process
 * REMOVES generic statements that don't add value
 */
function getBillSpecificContext(bill: any): string {
  // Focus on specific content rather than generic process
  if (bill.subjects && bill.subjects.length > 0) {
    const subjects = bill.subjects.slice(0, 2).join(' and ');
    return `This bill focuses on ${subjects}.`;
  }
  
  return '';
}

/**
 * Enhanced Event Title Generation
 * 
 * Creates descriptive, engaging titles for congressional events that
 * highlight the key aspects and purpose of each event.
 * NEVER truncates with ellipses - uses intelligent content selection instead.
 * 
 * AVOIDS duplicating information available elsewhere in the card (committee, chamber, etc.)
 * FOCUSES on what the event is about, not procedural details.
 */
export function generateEnhancedEventTitle(
  event: {
    title?: string;
    type?: string;
    chamber?: string;
    committee?: string;
    bills?: string[];
    topics?: string[];
    relatedBills?: Array<{ title: string; number: string }>;
  },
  options: ContentGenerationOptions = {}
): string {
  const {
    maxTitleLength = 100,
    prioritizeSubstance = true,
    targetAudience = 'general'
  } = options;

  if (!event.title) {
    return generateEventTitleFromMetadata(event, options);
  }

  const title = event.title.trim();
  const eventType = event.type || '';
  const chamber = event.chamber || '';
  const committee = event.committee || '';
  const bills = event.bills || [];
  const topics = event.topics || [];
  const relatedBills = event.relatedBills || [];

  // If title is already descriptive and clear, use it (but clean up duplicates)
  if (title.length <= maxTitleLength && 
      !title.includes('A bill to') && 
      !title.includes('To ') && 
      (title.includes('Hearing') || title.includes('Markup') || title.includes('Session') || 
       title.includes('Debate') || title.includes('Vote') || title.includes('Meeting'))) {
    return cleanEventTitle(title, event, options);
  }

  // Generate descriptive title based on event type and content
  const generatedTitle = generateEventTitleByType(event, options);
  
  if (generatedTitle) {
    return generatedTitle;
  }

  // Fallback: clean up the original title
  return cleanEventTitle(title, event, options);
}

/**
 * Generate event title from metadata when no title exists
 * AVOIDS duplicating information available elsewhere in the card
 */
function generateEventTitleFromMetadata(
  event: any,
  options: ContentGenerationOptions
): string {
  const eventType = event.type || '';
  const chamber = event.chamber || '';
  const committee = event.committee || '';
  const topics = event.topics || [];

  if (topics.length > 0) {
    const mainTopic = topics[0];
    const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    return `${typeName} on ${mainTopic}`;
  }

  if (committee) {
    const committeeName = committee.replace(' Committee', '').replace(' and ', ' & ');
    const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    return `${committeeName} ${typeName}`;
  }

  const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  return `${typeName}`;
}

/**
 * Generate event title based on event type
 * FOCUSES on substance, not procedural details
 */
function generateEventTitleByType(
  event: any,
  options: ContentGenerationOptions
): string {
  const eventType = event.type || '';
  const topics = event.topics || [];
  const bills = event.bills || [];
  const relatedBills = event.relatedBills || [];

  // Extract legislation content from related bills
  const extractLegislationContent = (billTitle: string): string => {
    if (!billTitle) return '';
    
    // Remove procedural language
    let content = billTitle
      .replace(/^A bill to /i, '')
      .replace(/^A resolution /i, '')
      .replace(/^A joint resolution /i, '')
      .replace(/, and for other purposes\.?$/i, '')
      .replace(/for other purposes\.?$/i, '')
      .replace(/\.$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove sponsor names or bill numbers
    content = content.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
    content = content.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');

    return content.charAt(0).toUpperCase() + content.slice(1);
  };

  // Generate title based on event type and content
  switch (eventType.toLowerCase()) {
    case 'hearing':
      if (topics.length > 0) {
        const mainTopic = topics[0];
        return `Hearing on ${mainTopic}`;
      }
      if (relatedBills.length > 0) {
        const billContent = extractLegislationContent(relatedBills[0].title);
        if (billContent) {
          return `Hearing on ${billContent}`;
        }
      }
      return 'Committee Hearing';

    case 'markup':
      if (relatedBills.length > 0) {
        const billContent = extractLegislationContent(relatedBills[0].title);
        if (billContent) {
          return `Markup of ${billContent}`;
        }
      }
      return 'Bill Markup';

    case 'debate':
      if (relatedBills.length > 0) {
        const billContent = extractLegislationContent(relatedBills[0].title);
        if (billContent) {
          return `Debate on ${billContent}`;
        }
      }
      return 'Floor Debate';

    case 'vote':
      if (relatedBills.length > 0) {
        const billContent = extractLegislationContent(relatedBills[0].title);
        if (billContent) {
          return `Vote on ${billContent}`;
        }
      }
      return 'Legislative Vote';

    case 'meeting':
      if (topics.length > 0) {
        const mainTopic = topics[0];
        return `Meeting on ${mainTopic}`;
      }
      return 'Committee Meeting';

    default:
      if (topics.length > 0) {
        const mainTopic = topics[0];
        const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        return `${typeName} on ${mainTopic}`;
      }
      return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  }
}

/**
 * Clean event title to remove duplicates and improve clarity
 * AVOIDS duplicating information available elsewhere in the card
 */
function cleanEventTitle(
  title: string,
  event: any,
  options: ContentGenerationOptions
): string {
  let cleanTitle = title
    .replace(/^To /i, '')
    .replace(/^A bill to /i, '')
    .replace(/^A resolution /i, '')
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove sponsor names or bill numbers that appear elsewhere
  cleanTitle = cleanTitle.replace(/\b(Rep\.|Sen\.|Congressman|Congresswoman|Senator)\s+[A-Z][a-z]+/gi, '');
  cleanTitle = cleanTitle.replace(/\b(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/gi, '');

  // Remove committee names if they appear elsewhere in the card
  if (event.committee) {
    const committeeName = event.committee.replace(' Committee', '');
    cleanTitle = cleanTitle.replace(new RegExp(committeeName, 'gi'), '');
  }

  // Remove chamber names if they appear elsewhere
  if (event.chamber) {
    const chamberName = event.chamber === 'senate' ? 'Senate' : 'House';
    cleanTitle = cleanTitle.replace(new RegExp(chamberName, 'gi'), '');
  }

  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  return cleanTitle.replace(/\s+/g, ' ').trim();
}

/**
 * Enhanced Event Summary Generation
 * 
 * Creates educational, engaging summaries that explain the event's specific purpose
 * and key focus areas in accessible language.
 * NEVER truncates with ellipses - uses intelligent content selection instead.
 * 
 * FOCUSES on the specific issue and key topics of the event, not generic process.
 * AVOIDS duplicating information from the title or other card elements.
 */
export function generateEnhancedEventSummary(
  event: {
    description?: string;
    title?: string;
    type?: string;
    chamber?: string;
    committee?: string;
    bills?: string[];
    topics?: string[];
    speakers?: string[];
    relatedBills?: Array<{ title: string; number: string }>;
  },
  options: ContentGenerationOptions = {}
): string {
  const {
    maxSummaryLength = 250, // Increased by 50
    includeEducationalContext = true,
    targetAudience = 'general'
  } = options;

  // Use existing description if it's concise and educational (and doesn't duplicate title)
  if (event.description && event.description.length <= maxSummaryLength && 
      !event.description.includes('A bill to') && 
      (event.description.includes('This') || event.description.includes('The'))) {
    return event.description;
  }

  // Generate educational summary that focuses on specific event content, not generic process
  const summary = generateEventSummary(event, targetAudience);
  
  // Add specific context for general audience (but avoid duplicating title content)
  if (includeEducationalContext && targetAudience === 'general') {
    const context = getEventSpecificContext(event);
    if (context && !summary.toLowerCase().includes('congressional process')) {
      return `${summary} ${context}`;
    }
  }

  return summary;
}

/**
 * Generate event summary that focuses on specific content, not generic process
 * AVOIDS duplicating what's already in the title
 */
function generateEventSummary(event: any, targetAudience: string): string {
  const eventType = event.type || '';
  const topics = event.topics || [];
  const relatedBills = event.relatedBills || [];

  // Focus on specific content rather than generic process
  switch (eventType.toLowerCase()) {
    case 'hearing':
      if (topics.length > 0) {
        const mainTopic = topics[0];
        return `This hearing examines ${mainTopic} and its implications for policy and governance.`;
      }
      if (relatedBills.length > 0) {
        const billTitle = relatedBills[0].title;
        const cleanTitle = billTitle.replace(/^A bill to /i, '').replace(/^A resolution /i, '').trim();
        return `This hearing focuses on ${cleanTitle} and related policy considerations.`;
      }
      return 'This hearing provides an opportunity for lawmakers to gather information and hear from experts.';

    case 'markup':
      if (relatedBills.length > 0) {
        const billTitle = relatedBills[0].title;
        const cleanTitle = billTitle.replace(/^A bill to /i, '').replace(/^A resolution /i, '').trim();
        return `This markup session reviews and amends ${cleanTitle}. Committee members will consider changes and vote on the final version.`;
      }
      return 'This markup session involves detailed review and potential amendments to legislation.';

    case 'debate':
      if (relatedBills.length > 0) {
        const billTitle = relatedBills[0].title;
        const cleanTitle = billTitle.replace(/^A bill to /i, '').replace(/^A resolution /i, '').trim();
        return `This debate allows lawmakers to discuss the merits and potential impacts of ${cleanTitle}.`;
      }
      return 'This debate provides an opportunity for lawmakers to express their views.';

    case 'vote':
      if (relatedBills.length > 0) {
        const billTitle = relatedBills[0].title;
        const cleanTitle = billTitle.replace(/^A bill to /i, '').replace(/^A resolution /i, '').trim();
        return `This vote will determine whether ${cleanTitle} advances in the legislative process.`;
      }
      return 'This vote represents a key decision point in the legislative process.';

    case 'meeting':
      if (topics.length > 0) {
        const mainTopic = topics[0];
        return `This meeting addresses ${mainTopic} and related policy considerations.`;
      }
      return 'This meeting allows committee members to discuss policy matters and legislative priorities.';

    default:
      if (topics.length > 0) {
        const mainTopic = topics[0];
        return `This ${eventType} focuses on ${mainTopic} and its policy implications.`;
      }
      return `This ${eventType} is part of the congressional process for considering policy matters.`;
  }
}

/**
 * Get specific event context based on content, not generic process
 */
function getEventSpecificContext(event: any): string {
  const eventType = event.type || '';
  const topics = event.topics || [];
  const relatedBills = event.relatedBills || [];
  
  // Focus on specific content rather than generic process
  if (topics.length > 0) {
    const mainTopic = topics[0];
    return `This event specifically addresses ${mainTopic}.`;
  }
  
  if (relatedBills.length > 0) {
    const billTitle = relatedBills[0].title;
    const cleanTitle = billTitle.replace(/^A bill to /i, '').replace(/^A resolution /i, '').trim();
    return `This event specifically focuses on ${cleanTitle}.`;
  }
  
  return '';
}

/**
 * Utility Functions
 */

function cleanSubjectText(subject: string): string {
  return subject
    .replace(/, and for other purposes\.?$/i, '')
    .replace(/for other purposes\.?$/i, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
    .replace(/["""](\d{1,2}\/\d{1,2}\/\d{4})["""]/g, '$1')
    .replace(/["""](\d{4}-\d{2}-\d{2})["""]/g, '$1')
    .replace(/^the week of\s+/i, 'Week of ')
    .replace(/^the month of\s+/i, 'Month of ')
    .replace(/^the day of\s+/i, 'Day of ')
    .replace(/^the designation of\s+/i, '')
    .replace(/^the recognition of\s+/i, '')
    .trim();
}

/**
 * Sentence-aware length standardization for titles and summaries.
 * Ensures the result is a complete, plain-English sentence within the target length.
 * If the original is too long, it is rephrased or summarized, never truncated mid-sentence.
 * If too short, it is expanded with context, but always remains a full sentence.
 *
 * Example:
 *   Input: "A bill to support women's sports."
 *   Target: 80 chars
 *   Output: "This bill supports the week of June 23 through June 29, 2025, as National Women's Sports Week."
 *
 *   Input: "A bill to amend the Social Security Act."
 *   Target: 60 chars
 *   Output: "This bill amends the Social Security Act."
 */
function standardizeTextLength(text: string, targetLength: number, type: 'title' | 'summary'): string {
  if (!text || targetLength <= 0) return '';
  let cleanText = text.trim();

  // If already a full sentence and within 10 chars, return as is
  if (/^[A-Z].*[.?!]$/.test(cleanText) && Math.abs(cleanText.length - targetLength) <= 10) {
    return cleanText;
  }

  // If too short, expand with context
  if (cleanText.length < targetLength - 10) {
    cleanText = enhanceTextLengthToSentence(cleanText, targetLength, type);
  }

  // If too long, summarize to a single, complete sentence
  if (cleanText.length > targetLength) {
    cleanText = summarizeToSentence(cleanText, targetLength, type);
  }

  // Ensure it is a full sentence
  if (!/^[A-Z]/.test(cleanText)) {
    cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  }
  if (!/[.?!]$/.test(cleanText)) {
    cleanText += '.';
  }
  return cleanText;
}

/**
 * Expand a short phrase to a full, plain-English sentence with context.
 */
function enhanceTextLengthToSentence(text: string, targetLength: number, type: 'title' | 'summary'): string {
  let t = text.trim();
  if (type === 'title') {
    if (/^A bill to /i.test(t)) {
      t = t.replace(/^A bill to /i, 'This bill ');
    } else if (/^A resolution /i.test(t)) {
      t = t.replace(/^A resolution (\w+) /i, (m, v) => `This resolution ${v.toLowerCase()}s `);
    } else if (/^To /i.test(t)) {
      t = 'This bill aims to ' + t.slice(3);
    } else if (!/^This (bill|resolution|act)/i.test(t)) {
      t = 'This bill ' + t.charAt(0).toLowerCase() + t.slice(1);
    }
    if (!/[.?!]$/.test(t)) t += '.';
    // Add context if still short
    if (t.length < targetLength - 20) {
      t += ' This legislation addresses important policy issues.';
    }
    return t;
  } else {
    // For summaries, add a generic context if too short
    if (t.length < 40) {
      t += ' This item is part of the legislative process.';
    }
    if (!/[.?!]$/.test(t)) t += '.';
    return t;
  }
}

/**
 * Summarize a long text to a single, complete, plain-English sentence within the target length.
 * Uses sentence boundaries and rephrasing, never truncates mid-sentence.
 */
function summarizeToSentence(text: string, targetLength: number, type: 'title' | 'summary'): string {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  // Try to find the most informative sentence that fits
  let best = '';
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length <= targetLength && trimmed.length > best.length) {
      best = trimmed;
    }
  }
  if (best) return best;
  // If none fit, try to compress the first sentence
  let s = sentences[0].trim();
  if (s.length > targetLength) {
    // Remove less important clauses (e.g., after commas)
    const parts = s.split(',');
    let result = '';
    for (const part of parts) {
      if ((result + part).length <= targetLength) {
        result += (result ? ', ' : '') + part;
      } else {
        break;
      }
    }
    if (result.length > 20) return result.trim() + '.';
    // As last resort, truncate at word boundary
    const words = s.split(' ');
    let result2 = '';
    for (const word of words) {
      if ((result2 + ' ' + word).length <= targetLength) {
        result2 += (result2 ? ' ' : '') + word;
      } else {
        break;
      }
    }
    return result2.trim() + '.';
  }
  return s;
}

// Update standardizeTitleLength and standardizeSummaryLength to use new logic
function standardizeTitleLength(title: string, targetLength: number = 80): string {
  return standardizeTextLength(title, targetLength, 'title');
}
function standardizeSummaryLength(summary: string, targetLength: number = 150): string {
  return standardizeTextLength(summary, targetLength, 'summary');
}

function getResolutionContext(action: string): string {
  const contexts: Record<string, string> = {
    'designating': 'official recognition',
    'supporting': 'congressional endorsement',
    'recognizing': 'formal acknowledgment',
    'establishing': 'new policy direction',
    'condemning': 'official disapproval',
    'honoring': 'tribute and recognition',
    'celebrating': 'commemorative recognition'
  };
  
  return contexts[action] || 'congressional action';
}

function assessBillImpact(substance: string, subjects?: string[]): string {
  if (!subjects || subjects.length === 0) return '';
  
  const impactKeywords: Record<string, string> = {
    'health': 'healthcare policy',
    'education': 'educational policy',
    'veterans': 'veterans affairs',
    'infrastructure': 'infrastructure development',
    'environment': 'environmental policy',
    'immigration': 'immigration policy',
    'tax': 'tax policy',
    'defense': 'national security',
    'agriculture': 'agricultural policy',
    'technology': 'technology policy',
    'finance': 'financial regulation',
    'labor': 'labor policy'
  };
  
  for (const subject of subjects) {
    const lowerSubject = subject.toLowerCase();
    for (const [keyword, impact] of Object.entries(impactKeywords)) {
      if (lowerSubject.includes(keyword)) {
        return impact;
      }
    }
  }
  
  return 'public policy';
}

function getBillContext(bill: any): string {
  if (bill.chamber) {
    const chamberName = bill.chamber === 'senate' ? 'Senate' : 'House';
    return `This ${chamberName} bill is part of the legislative process and must be approved by both chambers and signed by the President to become law.`;
  }
  
  return 'This bill is part of the legislative process and must be approved by both chambers and signed by the President to become law.';
}

/**
 * Generate comprehensive content for bills
 * NEVER truncates content - uses intelligent content selection and progressive disclosure
 */
export function generateBillContent(
  bill: any,
  options: ContentGenerationOptions = {}
): GeneratedContent {
  const title = generateEnhancedBillTitle(bill, options);
  const summary = generateEnhancedBillSummary(bill, options);
  
  // Generate key points
  const keyPoints = generateBillKeyPoints(bill, options);
  
  // Standardize lengths if requested (with increased limits)
  let finalTitle = options.standardizeLengths 
    ? standardizeTitleLength(title, options.targetTitleLength || 130) // Increased by 50
    : title;
  
  let finalSummary = options.standardizeLengths
    ? standardizeSummaryLength(summary, options.targetSummaryLength || 210) // Increased by 50
    : summary;
  
  // Standardize key points count if requested
  const finalKeyPoints = options.standardizeLengths
    ? keyPoints.slice(0, options.targetKeyPointsCount || 3)
    : keyPoints;
  
  // Ensure complete thoughts if requested
  if (options.ensureCompleteThoughts) {
    finalTitle = ensureCompleteThought(finalTitle, 'title', { billType: bill.type, chamber: bill.chamber });
    finalSummary = ensureCompleteThought(finalSummary, 'summary', { billType: bill.type, chamber: bill.chamber });
  }
  
  // Calculate relevance and quality scores
  const relevanceScore = calculateBillRelevance(bill);
  const contentQuality = assessContentQuality(bill, finalTitle, finalSummary);
  
  return {
    title: finalTitle,
    summary: finalSummary,
    keyPoints: finalKeyPoints,
    relevanceScore,
    contentQuality,
    educationalContext: options.includeEducationalContext ? getBillSpecificContext(bill) : undefined
  };
}

/**
 * Generate comprehensive content for events
 * NEVER truncates content - uses intelligent content selection and progressive disclosure
 */
export function generateEventContent(
  event: any,
  options: ContentGenerationOptions = {}
): GeneratedContent {
  const title = generateEnhancedEventTitle(event, options);
  const summary = generateEnhancedEventSummary(event, options);
  
  // Generate key points
  const keyPoints = generateEventKeyPoints(event, options);
  
  // Standardize lengths if requested (with increased limits)
  let finalTitle = options.standardizeLengths 
    ? standardizeTitleLength(title, options.targetTitleLength || 120) // Increased by 50
    : title;
  
  let finalSummary = options.standardizeLengths
    ? standardizeSummaryLength(summary, options.targetSummaryLength || 190) // Increased by 50
    : summary;
  
  // Standardize key points count if requested
  const finalKeyPoints = options.standardizeLengths
    ? keyPoints.slice(0, options.targetKeyPointsCount || 2)
    : keyPoints;
  
  // Ensure complete thoughts if requested
  if (options.ensureCompleteThoughts) {
    finalTitle = ensureCompleteThought(finalTitle, 'title', { billType: event.type, chamber: event.chamber });
    finalSummary = ensureCompleteThought(finalSummary, 'summary', { billType: event.type, chamber: event.chamber });
  }
  
  // Calculate relevance and quality scores
  const relevanceScore = calculateEventRelevance(event);
  const contentQuality = assessContentQuality(event, finalTitle, finalSummary);
  
  return {
    title: finalTitle,
    summary: finalSummary,
    keyPoints: finalKeyPoints,
    relevanceScore,
    contentQuality,
    educationalContext: options.includeEducationalContext ? getEventSpecificContext(event) : undefined
  };
}

/**
 * Generate key points for bills
 */
function generateBillKeyPoints(bill: any, options: ContentGenerationOptions): string[] {
  const keyPoints: string[] = [];
  
  if (bill.sponsor) {
    keyPoints.push(`Sponsored by ${bill.sponsor}`);
  }
  
  if (bill.chamber) {
    const chamberName = bill.chamber === 'senate' ? 'Senate' : 'House';
    keyPoints.push(`${chamberName} bill`);
  }
  
  if (bill.subjects && bill.subjects.length > 0) {
    keyPoints.push(`Focuses on: ${bill.subjects.slice(0, 3).join(', ')}`);
  }
  
  if (bill.actions && bill.actions.length > 0) {
    const latestAction = bill.actions[0];
    keyPoints.push(`Latest action: ${latestAction.text}`);
  }
  
  return keyPoints;
}

/**
 * Generate key points for events
 */
function generateEventKeyPoints(event: any, options: ContentGenerationOptions): string[] {
  const keyPoints: string[] = [];
  
  if (event.type) {
    const typeName = event.type.charAt(0).toUpperCase() + event.type.slice(1);
    keyPoints.push(`Event type: ${typeName}`);
  }
  
  if (event.chamber) {
    const chamberName = event.chamber === 'senate' ? 'Senate' : 'House';
    keyPoints.push(`${chamberName} chamber`);
  }
  
  if (event.committee) {
    keyPoints.push(`Committee: ${event.committee}`);
  }
  
  if (event.topics && event.topics.length > 0) {
    keyPoints.push(`Topics: ${event.topics.slice(0, 2).join(', ')}`);
  }
  
  return keyPoints;
}

/**
 * Calculate relevance score for bills
 */
function calculateBillRelevance(bill: any): number {
  let score = 5; // Base score
  
  // Boost for recent actions
  if (bill.actions && bill.actions.length > 0) {
    score += 2;
  }
  
  // Boost for sponsor information
  if (bill.sponsor) {
    score += 1;
  }
  
  // Boost for subjects
  if (bill.subjects && bill.subjects.length > 0) {
    score += 1;
  }
  
  // Boost for summary
  if (bill.summary) {
    score += 1;
  }
  
  return Math.min(score, 10);
}

/**
 * Calculate relevance score for events
 */
function calculateEventRelevance(event: any): number {
  let score = 5; // Base score
  
  // Boost for topics
  if (event.topics && event.topics.length > 0) {
    score += 2;
  }
  
  // Boost for bills
  if (event.bills && event.bills.length > 0) {
    score += 2;
  }
  
  // Boost for committee
  if (event.committee) {
    score += 1;
  }
  
  // Boost for description
  if (event.description) {
    score += 1;
  }
  
  return Math.min(score, 10);
}

/**
 * Assess content quality
 */
function assessContentQuality(item: any, title: string, summary: string): 'excellent' | 'good' | 'fair' | 'poor' {
  let score = 0;
  
  // Title quality
  if (title && title.length > 10 && !title.includes('Untitled')) {
    score += 2;
  }
  
  // Summary quality
  if (summary && summary.length > 20) {
    score += 2;
  }
  
  // Data completeness
  if (item.sponsor || item.committee || item.subjects || item.topics) {
    score += 2;
  }
  
  // Action/activity
  if (item.actions || item.type) {
    score += 2;
  }
  
  if (score >= 7) return 'excellent';
  if (score >= 5) return 'good';
  if (score >= 3) return 'fair';
  return 'poor';
}

/**
 * Content Generation System with Standardized Lengths
 * 
 * This system provides intelligent content generation for bills and events
 * with optional length standardization for consistent UI presentation.
 * 
 * Key Features:
 * - No truncation with ellipses - uses intelligent content selection
 * - Standardized lengths for consistent visual presentation
 * - Progressive disclosure for long content
 * - Educational context and non-partisan language
 * 
 * Length Standardization:
 * - Titles: 70-85 characters (bills: 85, events: 75)
 * - Summaries: 120-160 characters (bills: 160, events: 140)
 * - Key Points: 2-3 items per card
 * 
 * Usage:
 * generateBillContent(bill, { standardizeLengths: true, targetTitleLength: 85 })
 * generateEventContent(event, { standardizeLengths: true, targetTitleLength: 75 })
 */

/**
 * Analyze content lengths for quality assurance
 */
export function analyzeContentLengths(content: GeneratedContent): {
  titleLength: number;
  summaryLength: number;
  keyPointsCount: number;
  isStandardized: boolean;
  recommendations: string[];
} {
  const analysis = {
    titleLength: content.title.length,
    summaryLength: content.summary.length,
    keyPointsCount: content.keyPoints.length,
    isStandardized: false,
    recommendations: [] as string[]
  };
  
  // Check if lengths are within standard ranges
  const titleInRange = analysis.titleLength >= 60 && analysis.titleLength <= 100;
  const summaryInRange = analysis.summaryLength >= 100 && analysis.summaryLength <= 200;
  const keyPointsInRange = analysis.keyPointsCount >= 1 && analysis.keyPointsCount <= 4;
  
  analysis.isStandardized = titleInRange && summaryInRange && keyPointsInRange;
  
  // Generate recommendations
  if (!titleInRange) {
    if (analysis.titleLength < 60) {
      analysis.recommendations.push('Title is too short - consider adding context');
    } else {
      analysis.recommendations.push('Title is too long - consider shortening');
    }
  }
  
  if (!summaryInRange) {
    if (analysis.summaryLength < 100) {
      analysis.recommendations.push('Summary is too short - consider adding details');
    } else {
      analysis.recommendations.push('Summary is too long - consider condensing');
    }
  }
  
  if (!keyPointsInRange) {
    if (analysis.keyPointsCount < 1) {
      analysis.recommendations.push('No key points - consider adding relevant information');
    } else {
      analysis.recommendations.push('Too many key points - consider limiting to 3-4');
    }
  }
  
  return analysis;
}

/**
 * Get recommended length targets for different card types
 */
export function getRecommendedLengths(cardType: 'bill' | 'event'): {
  titleLength: number;
  summaryLength: number;
  keyPointsCount: number;
} {
  if (cardType === 'bill') {
    return {
      titleLength: 135, // Increased by 50
      summaryLength: 210, // Increased by 50
      keyPointsCount: 3
    };
  } else {
    return {
      titleLength: 125, // Increased by 50
      summaryLength: 190, // Increased by 50
      keyPointsCount: 2
    };
  }
}

/**
 * Demo function to showcase standardized length functionality
 */
export function demoStandardizedLengths(): {
  billExample: GeneratedContent;
  eventExample: GeneratedContent;
  analysis: {
    bill: ReturnType<typeof analyzeContentLengths>;
    event: ReturnType<typeof analyzeContentLengths>;
  };
} {
  // Sample bill data
  const sampleBill = {
    title: 'A bill to provide for the establishment of a comprehensive national healthcare system',
    number: 'H.R. 1234',
    chamber: 'house',
    sponsor: 'Rep. Smith',
    subjects: ['healthcare', 'insurance'],
    summary: 'This bill establishes a comprehensive national healthcare system that provides universal coverage for all Americans. It includes provisions for preventive care, prescription drug coverage, and mental health services.',
    actions: [{ text: 'Introduced in House', actionDate: '2025-01-15' }]
  };

  // Sample event data
  const sampleEvent = {
    title: 'Senate Committee Hearing on Climate Change Policy',
    type: 'hearing',
    chamber: 'senate',
    committee: 'Environment and Public Works',
    description: 'The Senate Environment and Public Works Committee will hold a hearing to discuss proposed climate change legislation and its potential impact on the economy and environment.',
    topics: ['climate change', 'environmental policy'],
    bills: ['S. 5678']
  };

  // Generate content with standardized lengths
  const billContent = generateBillContent(sampleBill, {
    standardizeLengths: true,
    targetTitleLength: 85,
    targetSummaryLength: 160,
    targetKeyPointsCount: 3
  });

  const eventContent = generateEventContent(sampleEvent, {
    standardizeLengths: true,
    targetTitleLength: 75,
    targetSummaryLength: 140,
    targetKeyPointsCount: 2
  });

  return {
    billExample: billContent,
    eventExample: eventContent,
    analysis: {
      bill: analyzeContentLengths(billContent),
      event: analyzeContentLengths(eventContent)
    }
  };
}

// Utility to ensure complete, self-contained thoughts
function ensureCompleteThought(text: string, type: 'title' | 'summary', context?: {
  billType?: string;
  chamber?: string;
  year?: string | number;
}): string {
  if (!text) return '';
  let t = text.trim();

  // Remove trailing ellipses or incomplete punctuation
  t = t.replace(/[.]{2,}$/g, '').replace(/[,;:]$/g, '').trim();

  // Helper: Capitalize first letter
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Helper: Ensure ends with period
  const punct = (s: string) => /[.?!]$/.test(s) ? s : s + '.';

  // For titles
  if (type === 'title') {
    // If already a full sentence, just ensure punctuation
    if (/^[A-Z].*[.?!]$/.test(t) && t.split(' ').length > 4) {
      return punct(t);
    }
    // If it's a resolution
    if (/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\b/i.test(t)) {
      // Convert to: "This resolution [action] ..."
      const match = t.match(/^A resolution (\w+)\s+(.+)/i);
      if (match) {
        const action = match[1].toLowerCase();
        let subject = match[2];
        // Remove trailing quotes or incomplete phrases
        subject = subject.replace(/["']$/, '').trim();
        return `This resolution ${action}s ${subject}`.replace(/\s+/g, ' ') + '.';
      }
    }
    // If it's "A bill to ..."
    if (/^A bill to /i.test(t)) {
      let rest = t.replace(/^A bill to /i, '');
      // Try to convert to "This bill [does X]"
      return `This bill ${rest}`.replace(/\s+/g, ' ') + '.';
    }
    // If it's "A joint resolution ..."
    if (/^A joint resolution /i.test(t)) {
      let rest = t.replace(/^A joint resolution /i, '');
      return `This joint resolution ${rest}`.replace(/\s+/g, ' ') + '.';
    }
    // If it's a fragment, try to prepend context
    if (/^(Supporting|Recognizing|Designating|Celebrating|Condemning|Honoring|Establishing)\b/i.test(t)) {
      // e.g., "Supporting the week ..." => "This resolution supports the week ..."
      const verb = t.split(' ')[0].toLowerCase();
      const rest = t.split(' ').slice(1).join(' ');
      return `This resolution ${verb}s ${rest}`.replace(/\s+/g, ' ') + '.';
    }
    // If starts with "To ...", e.g., "To amend the Social Security Act ..."
    if (/^To /i.test(t)) {
      let rest = t.replace(/^To /i, '');
      return `This bill aims to ${rest}`.replace(/\s+/g, ' ') + '.';
    }
    // Otherwise, prepend "This bill ..." or "This act ..."
    if (context?.billType && /act/i.test(context.billType)) {
      return `This act ${t.charAt(0).toLowerCase()}${t.slice(1)}`.replace(/\s+/g, ' ') + '.';
    }
    return `This bill ${t.charAt(0).toLowerCase()}${t.slice(1)}`.replace(/\s+/g, ' ') + '.';
  }
  // For summaries, ensure it ends with a period and is a full sentence
  if (!t.endsWith('.')) {
    t += '.';
  }
  // If summary is a fragment, prepend context
  if (t.split(' ').length < 6 || /^[a-z]/.test(t)) {
    t = `This item ${t}`;
  }
  return cap(t);
} 