'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Stack,
  Paper,
  Card,
  CardContent,
  CardActions,
  Chip,
  Avatar,
  Skeleton,
  Alert,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  FormControlLabel,
  Switch,
  Grid,
  CircularProgress,
  LinearProgress,
  ButtonGroup,
} from '@mui/material';
import {
  Explore,
  TrendingUp,
  TrendingDown,
  Remove,
  LiveTv,
  Schedule,
  CheckCircle,
  Refresh,
  ArrowForward,
  Person,
  Description,
  Gavel,
  LocationOn,
  AccessTime,
  NewReleases,
  InfoOutlined,
  Public,
  Visibility,
  BookmarkBorder,
  Share,
  Search,
  Info,
  Star,
  Receipt,
  AccountBalance,
  Psychology,
  Event as EventIcon,
  Error,
  Home,
  Add,
  Flag,
  HowToVote,
  EventNote,
} from '@mui/icons-material';
import Link from 'next/link';
import PoliticalIntelligenceCard from './components/PoliticalIntelligenceCard';
import { EnhancedSearchBar } from './components/EnhancedSearchBar';
import { CongressionalLabelTooltip } from './components/CongressionalLabelTooltip';
import { GeographicContextDisplay } from './components/CongressionalLabelTooltip';
import { generateKeyTakeaways } from '../lib/live-data-fetcher';
import Timeline, { TimelineStage } from './components/Timeline';
import { useBillsData, Bill } from './lib/useBillsData';
import BillCard from '@/components/bills/BillCard';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import { getEventTypeColor, getPriorityColor } from '../lib/theme';
import { useDarkMode } from '@/lib/useDarkMode';
import { useThemeUtils } from '@/components/ui/ThemeUtils';
import { Tooltip } from '@/components/ui/Tooltip';
import { alpha } from '@mui/material/styles';
import { generateEventContent } from '@/lib/content-generation';
import TrendingBillsSidebar from '@/components/TrendingBillsSidebar';
import CalendarView from '@/components/CalendarView';

// Utility function to format bill number
/**
 * Formats a bill number with appropriate prefix based on chamber
 * @param bill - The bill object containing number and chamber information
 * @returns Formatted bill number string (e.g., "S. 1234" or "H.R. 5678")
 */
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

/**
 * Formats bill IDs from events into proper bill numbers
 * Handles various bill ID formats and converts them to readable bill numbers
 * 
 * @param billId - The bill ID string to format
 * @returns Formatted bill number string
 * 
 * @example
 * formatBillId('bill-119-unknown-2167') // Returns "S. 2167"
 * formatBillId('H.R. 1234') // Returns "H.R. 1234" (already formatted)
 * formatBillId('5678') // Returns "H.R. 5678" (assumes House bill)
 */
const formatBillId = (billId: string): string => {
  // Handle different bill ID formats
  if (billId.startsWith('bill-')) {
    // Format: bill-119-unknown-2167 -> S. 2167 (assuming Senate based on pattern)
    const parts = billId.split('-');
    if (parts.length >= 4) {
      const congress = parts[1];
      const billType = parts[2];
      const billNumber = parts[3];
      
      // Determine prefix based on bill type or pattern
      let prefix = 'H.R.';
      if (billType === 's' || billNumber.length <= 4) {
        prefix = 'S.';
      } else if (billType === 'hr' || billNumber.length > 4) {
        prefix = 'H.R.';
      }
      
      return `${prefix} ${billNumber}`;
    }
  } else if (billId.match(/^(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*\d+/i)) {
    // Already formatted bill number
    return billId;
  } else if (billId.match(/^\d+$/)) {
    // Just a number, assume House bill
    return `H.R. ${billId}`;
  }
  
  // Fallback: return the original ID
  return billId;
};

// Interface for live events from API
interface LiveEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  chamber: string;
  source: string;
  url: string;
  description: string;
  contentId: string;
  hasRealSummary: boolean;
  topics: string[];
  speakers: string[];
  bills: string[];
  priority: number;
  committee?: string;
  isLiveEvent?: boolean;
  relevanceScore?: {
    score: number;
    factors: {
      urgency: number;
      impact: number;
      controversy: number;
      publicInterest: number;
      politicalDrama: number;
      deadlinePressure: number;
    };
    reasoning: string[];
    tags: string[];
  };
  politicalIntelligence?: {
    type: 'breaking' | 'background' | 'sleeper' | 'routine';
    urgency: 'critical' | 'high' | 'medium' | 'low';
    impact: 'national' | 'regional' | 'committee' | 'procedural';
    drama: 'high' | 'medium' | 'low';
    predictions: string[];
    context: string;
    relatedIssues: string[];
  };
  metadata?: {
    speakers?: string[];
    topics?: string[];
    bills?: string[];
    eventType?: string;
    chamber?: string;
    priority?: string;
    importance?: string;
    controversy?: string;
    publicEngagement?: {
      viewers?: number;
      socialMentions?: number;
      trending?: boolean;
    };
    speakerDetails?: Array<{
      name: string;
      role: string;
      party?: string;
      state?: string;
    }>;
    relatedBills?: Array<{
      number: string;
      title: string;
      status: string;
      sponsor: string;
    }>;
    keyTopics?: string[];
    status?: 'live' | 'upcoming' | 'completed';
    startTime?: string;
    endTime?: string;
    duration?: string | number;
    location?: string;
    venue?: string;
    isLiveEvent?: boolean;
    source?: string;
    lastUpdated?: string;
    mediaCoverage?: {
      cspan?: string;
      youtube?: string;
      transcript?: string;
    };
    expectedOutcomes?: string[];
    historicalContext?: string;
    tags?: string[];
    lastAction?: string;
  };
  lastAction?: string;
  stages?: TimelineStage[];
}

interface LiveContentResponse {
  success: boolean;
  data: LiveEvent[];
  count: number;
  source: string;
  days: number;
  limit: number;
  hasLiveData: boolean;
  apiKeyConfigured: boolean;
  error?: string;
}

// Add a helper to map event type codes to human-readable labels and tooltips
const eventTypeLabels: Record<string, { label: string, description: string }> = {
  markup: { label: 'Committee Markup Session', description: 'A meeting where a congressional committee debates, amends, and rewrites proposed legislation.' },
  hearing: { label: 'Committee Hearing', description: 'A meeting where a committee receives testimony from people interested in the legislation.' },
  floor: { label: 'Floor Session', description: 'A formal meeting of the full House or Senate to debate and vote on legislation.' },
  session: { label: 'Chamber Session', description: 'A general meeting of the House or Senate.' },
  vote: { label: 'Vote', description: 'A formal vote on legislation or other matters.' },
  other: { label: 'Other Event', description: 'A congressional event not classified above.' },
};

/**
 * Standardizes title length to ensure consistent display across the application
 * Expands short titles to maintain visual consistency but does not truncate long titles
 * 
 * @param title - The title to standardize
 * @param targetLength - Target length in characters (default: 90)
 * @param minLength - Minimum length before expansion (default: 60)
 * @param maxLength - Maximum length before truncation (default: 120) - not used for truncation
 * @returns Standardized title with consistent length
 */
function standardizeTitleLength(title: string, targetLength: number = 90, minLength: number = 60, maxLength: number = 120): string {
  if (!title) return 'Congressional Event';
  
  const cleanTitle = title.trim();
  
  // If title is already within acceptable range, return as is
  if (cleanTitle.length >= minLength && cleanTitle.length <= maxLength) {
    return cleanTitle;
  }
  
  // If title is too short, try to expand it
  if (cleanTitle.length < minLength) {
    // Add context to short titles
    if (cleanTitle.includes('Hearing') || cleanTitle.includes('Markup') || cleanTitle.includes('Session')) {
      return cleanTitle; // Keep descriptive titles as is
    }
    
    // For very short titles, add more context
    if (cleanTitle.length < 30) {
      return `Congressional Event: ${cleanTitle}`;
    }
    
    return cleanTitle; // Keep moderately short titles
  }
  
  // If title is too long, return it as is without truncation
  // This ensures full titles are always displayed
  return cleanTitle;
}

/**
 * Generates descriptive, accurate titles for congressional events
 * Creates engaging titles that reflect official congressional processes and procedures
 * Focuses on the substance of legislation rather than procedural details
 * 
 * @param event - The event object containing title, type, and metadata
 * @returns A descriptive, accurate title for the event
 */
function generateEventTitle(event: LiveEvent): string {
  if (!event.title) return 'Congressional Event';
  
  const title = event.title.trim();
  const eventType = event.type || event.metadata?.eventType || '';
  const chamber = event.chamber || event.metadata?.chamber || '';
  const committee = event.committee || '';
  const bills = event.bills || event.metadata?.bills || [];
  const topics = event.topics || event.metadata?.topics || event.metadata?.keyTopics || [];
  const relatedBills = event.metadata?.relatedBills || [];
  
  // If title is already descriptive and clear, use it
  if (title.length <= 80 && !title.includes('A bill to') && !title.includes('To ') && 
      (title.includes('Hearing') || title.includes('Markup') || title.includes('Session') || 
       title.includes('Debate') || title.includes('Vote') || title.includes('Meeting'))) {
    return standardizeTitleLength(title);
  }
  
  // Extract bill numbers and titles if present
  const billNumbers = bills.map(bill => {
    const match = bill.match(/(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*(\d+)/i);
    return match ? `${match[1]} ${match[2]}` : null;
  }).filter(Boolean);
  
  const billTitles = relatedBills.map(bill => bill.title).filter(Boolean);
  
  // Helper function to extract key content from bill titles
  const extractLegislationContent = (billTitle: string): string => {
    if (!billTitle) return '';
    
    // Remove common prefixes and focus on the substance
    let content = billTitle
      .replace(/^A bill to /i, '')
      .replace(/^To /i, '')
      .replace(/^A resolution /i, '')
      .replace(/^A joint resolution /i, '')
      .replace(/\.$/, '')
      .replace(/, and for other purposes\.?/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Capitalize first letter
    content = content.charAt(0).toUpperCase() + content.slice(1);
    
    // Return the full content without truncation
    return content;
  };
  
  // Generate descriptive title based on event type
  let generatedTitle = '';
  
  switch (eventType.toLowerCase()) {
    case 'hearing':
      if (billTitles.length > 0) {
        // Focus on the legislation content rather than committee
        const legislationContent = extractLegislationContent(billTitles[0]);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Hearing: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        // If we have bill numbers but no titles, focus on the topic
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        const committeeName = committee ? committee.replace(' Committee', '') : 'Committee';
        generatedTitle = `${chamberName} ${committeeName} Hearing on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        // Focus on the topic/subject matter
        const mainTopic = topics[0];
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Hearing on ${mainTopic}`;
      } else if (committee) {
        // Fallback to committee name but avoid duplication
        const shortCommittee = committee.replace(' Committee', '').replace(' and ', ' & ');
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} ${shortCommittee} Hearing`;
      }
      break;
      
    case 'markup':
      if (billTitles.length > 0) {
        // Focus on the legislation content
        const legislationContent = extractLegislationContent(billTitles[0]);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Markup: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        const committeeName = committee ? committee.replace(' Committee', '') : 'Committee';
        generatedTitle = `${chamberName} ${committeeName} Markup on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        const mainTopic = topics[0];
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Markup Session on ${mainTopic}`;
      } else if (committee) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        const committeeName = committee.replace(' Committee', '').replace(' and ', ' & ');
        generatedTitle = `${chamberName} ${committeeName} Markup Session`;
      } else {
        generatedTitle = `${chamber === 'senate' ? 'Senate' : 'House'} Committee Markup Session`;
      }
      break;
      
    case 'floor':
      if (billTitles.length > 0) {
        // Focus on the legislation content
        const legislationContent = extractLegislationContent(billTitles[0]);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Floor Debate: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Floor Debate on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        const mainTopic = topics[0];
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Floor Debate on ${mainTopic}`;
      } else {
        generatedTitle = `${chamber === 'senate' ? 'Senate' : 'House'} Floor Session`;
      }
      break;
      
    case 'vote':
      if (billTitles.length > 0) {
        // Focus on the legislation content
        const legislationContent = extractLegislationContent(billTitles[0]);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Vote: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Vote on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        const mainTopic = topics[0];
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Vote on ${mainTopic}`;
      } else {
        generatedTitle = `${chamber === 'senate' ? 'Senate' : 'House'} Vote`;
      }
      break;
      
    case 'session':
      if (chamber) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Legislative Session`;
      } else {
        generatedTitle = 'Congressional Session';
      }
      break;
      
    case 'meeting':
      if (committee) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        const committeeName = committee.replace(' Committee', '').replace(' and ', ' & ');
        generatedTitle = `${chamberName} ${committeeName} Committee Meeting`;
      } else {
        generatedTitle = `${chamber === 'senate' ? 'Senate' : 'House'} Committee Meeting`;
      }
      break;
      
    case 'debate':
      if (billTitles.length > 0) {
        // Focus on the legislation content
        const legislationContent = extractLegislationContent(billTitles[0]);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Debate: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Debate on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        const mainTopic = topics[0];
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} Debate on ${mainTopic}`;
      } else {
        generatedTitle = `${chamber === 'senate' ? 'Senate' : 'House'} Debate`;
      }
      break;
      
    default:
      // For other types, try to extract meaningful content
      if (billTitles.length > 0) {
        // Focus on the legislation content
        const legislationContent = extractLegislationContent(billTitles[0]);
        const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} ${typeName}: ${legislationContent}`;
      } else if (billNumbers.length > 0) {
        const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} ${typeName} on ${billNumbers.slice(0, 2).join(', ')}`;
      } else if (topics.length > 0) {
        const mainTopic = topics[0];
        const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
        const chamberName = chamber === 'senate' ? 'Senate' : 'House';
        generatedTitle = `${chamberName} ${typeName} on ${mainTopic}`;
      }
      break;
  }
  
  // If we generated a title, standardize its length
  if (generatedTitle) {
    return standardizeTitleLength(generatedTitle);
  }
  
  // Fallback: clean up the original title and focus on content
  let cleanTitle = extractLegislationContent(title);
  
  // Add chamber context if available and not already present
  if (chamber && !cleanTitle.includes('Senate') && !cleanTitle.includes('House')) {
    const chamberName = chamber === 'senate' ? 'Senate' : 'House';
    cleanTitle = `${chamberName}: ${cleanTitle}`;
  }
  
  // Standardize the length of the fallback title
  return standardizeTitleLength(cleanTitle) || 'Congressional Event';
}

/**
 * Generates concise, relevant summaries for congressional events
 * Creates engaging summaries that highlight key aspects of each event
 * 
 * @param event - The event object containing description, topics, and metadata
 * @returns A concise, engaging summary for the event
 */
function generateEventSummary(event: LiveEvent): string {
  // Use existing summary if it's concise and relevant
  if (event.description && event.description.length <= 150 && !event.description.includes('A bill to')) {
    return event.description;
  }

  const topics = event.topics || event.metadata?.topics || event.metadata?.keyTopics || [];
  const bills = event.bills || event.metadata?.bills || [];
  const eventType = event.type || event.metadata?.eventType || '';
  const committee = event.committee || '';
  const chamber = event.chamber || event.metadata?.chamber || '';

  // Generate summary based on available information
  if (topics.length > 0) {
    const mainTopic = topics[0];
    return mainTopic;
  }

  if (bills.length > 0) {
    const billNumbers = bills.map(bill => {
      const match = bill.match(/(H\.R\.|S\.|H\.J\.Res\.|S\.J\.Res\.)\s*(\d+)/i);
      return match ? `${match[1]} ${match[2]}` : null;
    }).filter(Boolean);
    
    if (billNumbers.length > 0) {
      const chamberName = chamber === 'senate' ? 'Senate' : 'House';
      const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
      return `${chamberName} ${typeName} on ${billNumbers.slice(0, 2).join(', ')}`;
    }
  }

  if (committee) {
    const shortCommittee = committee.replace(' Committee', '').replace(' and ', ' & ');
    const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
    return `${shortCommittee} ${typeName} session`;
  }

  // Fallback summary
  const chamberName = chamber === 'senate' ? 'Senate' : chamber === 'house' ? 'House' : 'Congressional';
  const typeName = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  return `${chamberName} ${typeName} session`;
}

/**
 * Maps bill actions to legislative timeline stages
 * Analyzes event actions to determine the current stage of a bill in the legislative process
 * 
 * @param event - The event object containing actions array
 * @returns Array of timeline stages with completion status
 */
function getBillStages(event: any): TimelineStage[] {
  // Define the ordered stages
  const stages: TimelineStage[] = [
    { name: 'Introduced', status: 'upcoming' },
    { name: 'Referred to Committee', status: 'upcoming' },
    { name: 'Referred to Subcommittee', status: 'upcoming' },
    { name: 'In Committee', status: 'upcoming' },
    { name: 'Hearing Scheduled', status: 'upcoming' },
    { name: 'Hearing Held', status: 'upcoming' },
    { name: 'Markup Scheduled', status: 'upcoming' },
    { name: 'Markup Session', status: 'upcoming' },
    { name: 'Reported by Committee', status: 'upcoming' },
    { name: 'Committee Killed Bill', status: 'upcoming' },
    { name: 'Placed on Calendar', status: 'upcoming' },
    { name: 'Rules Committee', status: 'upcoming' },
    { name: 'Floor Debate', status: 'upcoming' },
    { name: 'Amendment Process', status: 'upcoming' },
    { name: 'Final Passage Vote', status: 'upcoming' },
    { name: 'Passed House', status: 'upcoming' },
    { name: 'Passed Senate', status: 'upcoming' },
    { name: 'Different Versions', status: 'upcoming' },
    { name: 'Conference Committee', status: 'upcoming' },
    { name: 'Conference Report', status: 'upcoming' },
    { name: 'Final Congressional Approval', status: 'upcoming' },
    { name: 'Sent to President', status: 'upcoming' },
    { name: 'Signed into Law', status: 'upcoming' },
    { name: 'Presidential Veto', status: 'upcoming' },
    { name: 'Veto Override Attempt', status: 'upcoming' },
    { name: 'Pocket Veto', status: 'upcoming' },
  ];
  
  // Map actions to stages
  const actions = (event.actions || (event.metadata && event.metadata.actions) || []);
  let currentStageIdx = 0;
  
  actions.forEach((action: any) => {
    const text = (action.text || '').toLowerCase();
    if (text.includes('introduced')) currentStageIdx = Math.max(currentStageIdx, 0);
    if (text.includes('referred to committee')) currentStageIdx = Math.max(currentStageIdx, 1);
    if (text.includes('referred to subcommittee')) currentStageIdx = Math.max(currentStageIdx, 2);
    if (text.includes('committee')) currentStageIdx = Math.max(currentStageIdx, 3);
    if (text.includes('hearing scheduled')) currentStageIdx = Math.max(currentStageIdx, 4);
    if (text.includes('hearing held')) currentStageIdx = Math.max(currentStageIdx, 5);
    if (text.includes('markup scheduled')) currentStageIdx = Math.max(currentStageIdx, 6);
    if (text.includes('markup session')) currentStageIdx = Math.max(currentStageIdx, 7);
    if (text.includes('reported by committee')) currentStageIdx = Math.max(currentStageIdx, 8);
    if (text.includes('killed')) currentStageIdx = Math.max(currentStageIdx, 9);
    if (text.includes('placed on calendar')) currentStageIdx = Math.max(currentStageIdx, 10);
    if (text.includes('rules committee')) currentStageIdx = Math.max(currentStageIdx, 11);
    if (text.includes('floor debate')) currentStageIdx = Math.max(currentStageIdx, 12);
    if (text.includes('amendment')) currentStageIdx = Math.max(currentStageIdx, 13);
    if (text.includes('final passage')) currentStageIdx = Math.max(currentStageIdx, 14);
    if (text.includes('passed house')) currentStageIdx = Math.max(currentStageIdx, 15);
    if (text.includes('passed senate')) currentStageIdx = Math.max(currentStageIdx, 16);
    if (text.includes('different versions')) currentStageIdx = Math.max(currentStageIdx, 17);
    if (text.includes('conference committee')) currentStageIdx = Math.max(currentStageIdx, 18);
    if (text.includes('conference report')) currentStageIdx = Math.max(currentStageIdx, 19);
    if (text.includes('final congressional approval')) currentStageIdx = Math.max(currentStageIdx, 20);
    if (text.includes('sent to president')) currentStageIdx = Math.max(currentStageIdx, 21);
    if (text.includes('signed into law')) currentStageIdx = Math.max(currentStageIdx, 22);
    if (text.includes('vetoed')) currentStageIdx = Math.max(currentStageIdx, 23);
    if (text.includes('override')) currentStageIdx = Math.max(currentStageIdx, 24);
    if (text.includes('pocket veto')) currentStageIdx = Math.max(currentStageIdx, 25);
  });
  
  // Mark completed/current/upcoming
  return stages.map((stage, idx) => {
    if (idx < currentStageIdx) return { ...stage, status: 'completed' };
    if (idx === currentStageIdx) return { ...stage, status: 'current' };
    return stage;
  });
}

/**
 * Checks if a value is a placeholder or missing data indicator
 * Used to determine when to show tooltips explaining missing information
 * 
 * @param value - The string value to check
 * @returns True if the value indicates missing/placeholder data
 */
function isPlaceholder(value: string) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('no committee specified') ||
    lower.includes('no location provided') ||
    lower.includes('no duration specified') ||
    lower.includes('no date specified') ||
    lower.includes('unknown') ||
    lower.includes('placeholder')
  );
}

/**
 * EventCard Component
 * 
 * Displays a congressional event in a card format with comprehensive information including:
 * - Event type and chamber labels
 * - Related bill chips
 * - Date/time information
 * - Key takeaways and political intelligence
 * - Expandable details section
 * 
 * @param props - Component props containing event data
 * @returns JSX element representing an event card
 */
function EventCard({ event }: { event: LiveEvent }) {
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'hearing':
        return <Flag fontSize="small" />;
      case 'floor':
        return <AccountBalance fontSize="small" />;
      case 'markup':
        return <TrendingUp fontSize="small" />;
      case 'vote':
        return <HowToVote fontSize="small" />;
      case 'session':
        return <Schedule fontSize="small" />;
      default:
        return <EventNote fontSize="small" />;
    }
  };
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [clientDate, setClientDate] = useState<string | null>(null);

  // Generate enhanced content using the new utilities
  const content = generateEventContent(event, {
    targetAudience: 'general',
    includeEducationalContext: true,
    standardizeLengths: true,
    targetTitleLength: 125, // Increased by 50
    targetSummaryLength: 190, // Increased by 50
    targetKeyPointsCount: 2,
    ensureCompleteThoughts: true
  });

  // Use a deterministic format for SSR
  const ssrDate = event.date
    ? dayjs(event.date).format('YYYY-MM-DD')
    : 'No date specified';

  useEffect(() => {
    if (event.date && typeof window !== 'undefined') {
      const d = new Date(event.date);
      if (!isNaN(d.getTime())) {
        setClientDate(d.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        }));
      }
    }
  }, [event.date]);

  // Robust mapping for all fields
  const meta = event.metadata || {};
  const location = (meta.location as string | undefined) || (event as any).location || 'No location provided';
  const duration = (meta.duration as string | number | undefined) || (event as any).duration || 'No duration specified';
  const committee = (typeof (meta as any)?.committee === 'string' ? (meta as any).committee : (event as any).committee) || 'No committee specified';
  const status = (meta.status as string | undefined) || (event as any).status || 'No status specified';
  const relatedBills = Array.isArray(meta.relatedBills) ? meta.relatedBills : (Array.isArray(event.bills) ? event.bills : []);
  let priority: number = typeof meta.priority === 'number' ? meta.priority : (typeof meta.priority === 'string' ? parseInt(meta.priority) : (typeof event.priority === 'number' ? event.priority : 5));
  if (isNaN(priority)) priority = 5;
  const eventType = meta.eventType || event.type;
  const score = event.relevanceScore?.score || 0;
  const tags = event.relevanceScore?.tags || [];
  const actions = ((meta as any)?.actions as any[] | undefined) || (event as any).actions || [];
  const lastAction = ((meta as any)?.lastAction as string | undefined) || (event as any).lastAction || (actions && Array.isArray(actions) && actions.length > 0 ? actions[0].text : undefined) || 'No last action available';

  // Tooltips for definitions
  const tooltips = {
    type: 'The official category of this congressional event (e.g., hearing, markup, floor session).',
    priority: 'A system-generated score (1=highest, 10=lowest) based on event importance and relevance.',
    committee: 'The congressional committee responsible for this event.',
    location: 'Where the event is taking place (e.g., Capitol, committee room, virtual).',
    duration: 'How long the event is scheduled to last.',
    date: 'The scheduled date and time for the event.',
    relatedBills: 'Bills that are directly related to or discussed in this event.',
    score: 'A relevance score based on urgency, impact, controversy, and public interest.',
    tags: 'Key factors and classifications for this event.'
  };

  const keyTakeaways = generateKeyTakeaways({
    ...event,
    topics: event.topics || (meta as any)?.topics || (meta as any)?.keyTopics || (meta as any)?.subjects || [],
    politicalIntelligence: event.politicalIntelligence,
    actions: (meta as any)?.actions || [],
    voteCounts: (meta as any)?.voteCounts,
    status: (meta as any)?.status,
    chamber: event.chamber || (meta as any)?.chamber,
    sponsor: (meta as any)?.sponsor,
    summary: (meta as any)?.summary || event.description,
  });

  /**
   * Returns appropriate icon based on the content of a bullet point
   * @param text - The text content to analyze
   * @returns JSX element with appropriate icon
   */
  const getBulletIcon = (text: string) => {
    if (/key topics/i.test(text)) return <Gavel sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
    if (/vote/i.test(text)) return <CheckCircle sx={{ color: theme.palette.success.main, fontSize: 18, mr: 1 }} />;
    if (/latest action/i.test(text)) return <TrendingUp sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
    if (/sponsor/i.test(text)) return <Person sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
    if (/status/i.test(text)) return <Info sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
    if (/chamber/i.test(text)) return <Gavel sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
    return <Star sx={{ color: getEventTypeColor(theme, 'hearing'), fontSize: 18, mr: 1 }} />;
  };

  const stages = event.stages && Array.isArray(event.stages) ? event.stages : getBillStages(event);

  return (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 3,
      boxShadow: theme.palette.mode === 'dark' 
        ? '0 2px 12px rgba(255,255,255,0.08)' 
        : '0 2px 12px rgba(0,0,0,0.08)',
      border: `1px solid ${theme.palette.divider}`,
      bgcolor: theme.palette.background.paper,
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(255,255,255,0.12)' 
          : '0 8px 32px rgba(0,0,0,0.12)',
        transform: 'translateY(-2px)',
        borderColor: theme.palette.primary.main
      }
    }}>
      <CardContent sx={{ 
        flexGrow: 1, 
        p: 3,
        overflow: 'visible',
        minHeight: 'fit-content'
      }}>
        {/* Header with Related Bill, Event Type, and Chamber - All on Same Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Related Bill Number - Left */}
          {event.bills && event.bills.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {event.bills.slice(0, 2).map((bill, index) => (
                <Tooltip key={`bill-${bill}-${index}`} content={`View details for ${formatBillId(bill)}`}>
                  <Chip
                    label={formatBillId(bill)}
                    size="small"
                    clickable
                    icon={<Description fontSize="small" sx={{ color: theme.palette.mode === 'dark' ? theme.palette.info.contrastText : theme.palette.info.main }} />}
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.info.main, 0.7)
                        : alpha(theme.palette.info.main, 0.12),
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.info.contrastText
                        : theme.palette.info.main,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      height: 28,
                      borderRadius: 2,
                      cursor: 'pointer',
                      boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.info.main, 0.85)
                          : alpha(theme.palette.info.main, 0.18),
                      },
                      '& .MuiChip-icon': {
                        color: theme.palette.mode === 'dark'
                          ? theme.palette.info.contrastText
                          : theme.palette.info.main,
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add bill detail navigation
                      console.log('Bill clicked:', bill);
                    }}
                  />
                </Tooltip>
              ))}
              {event.bills.length > 2 && (
                <Tooltip content={`View ${event.bills.length - 2} more related bills`}>
                  <Chip
                    label={`+${event.bills.length - 2}`}
                    size="small"
                    icon={<Add fontSize="small" sx={{ color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.secondary }} />}
                    sx={{
                      backgroundColor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.action.active, 0.7)
                        : alpha(theme.palette.action.active, 0.12),
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.text.primary
                        : theme.palette.text.secondary,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24,
                      borderRadius: 2,
                      boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                      '& .MuiChip-icon': {
                        color: theme.palette.mode === 'dark'
                          ? theme.palette.text.primary
                          : theme.palette.text.secondary,
                      }
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          )}
          
          {/* Event Type/Stage - Center */}
          <Tooltip content={tooltips.type}>
            <Chip 
              label={eventType ? eventType.charAt(0).toUpperCase() + eventType.slice(1) : 'Event'}
              size="small"
              icon={React.cloneElement(getEventTypeIcon(eventType || ''), { 
                sx: { color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main } 
              })}
              sx={{ 
                fontWeight: 600, 
                fontSize: '0.75rem', 
                height: 24,
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.main, 0.7)
                  : alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.contrastText
                  : theme.palette.primary.main,
                borderRadius: 2,
                boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                '& .MuiChip-icon': {
                  color: theme.palette.mode === 'dark'
                    ? theme.palette.primary.contrastText
                    : theme.palette.primary.main,
                }
              }}
            />
          </Tooltip>
          
          {/* Chamber Label - Right */}
          {event.chamber && (
            <Tooltip content={`${event.chamber.charAt(0).toUpperCase() + event.chamber.slice(1)} chamber`}>
              <Chip 
                label={event.chamber.charAt(0).toUpperCase() + event.chamber.slice(1)}
                size="small"
                icon={React.cloneElement(event.chamber === 'house' ? <Home fontSize="small" /> : <AccountBalance fontSize="small" />, { 
                  sx: { color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main } 
                })}
                sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.75rem', 
                  height: 24,
                  backgroundColor: event.chamber === 'senate'
                    ? (theme.palette.mode === 'dark' ? alpha(theme.palette.secondary.main, 0.7) : alpha(theme.palette.secondary.main, 0.12))
                    : (theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.7) : alpha(theme.palette.primary.main, 0.12)),
                  color: event.chamber === 'senate'
                    ? (theme.palette.mode === 'dark' ? theme.palette.secondary.contrastText : theme.palette.secondary.main)
                    : (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main),
                  borderRadius: 2,
                  boxShadow: theme.palette.mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                  '& .MuiChip-icon': {
                    color: event.chamber === 'senate'
                      ? (theme.palette.mode === 'dark' ? theme.palette.secondary.contrastText : theme.palette.secondary.main)
                      : (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main),
                  }
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Title and Committee */}
        <Tooltip content={event.title}>
          <span>
            <Typography component="div" variant="h6" sx={{ 
              fontWeight: 600, 
              lineHeight: 1.3, 
              mb: 2,
              color: theme.palette.text.primary,
              fontSize: '1.1rem',
              overflow: 'visible',
              textOverflow: 'clip',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
              wordBreak: 'normal'
            }}>
              {content.title}
            </Typography>
          </span>
        </Tooltip>

        {committee && (
          <Tooltip content={isPlaceholder(committee) ? 'This information is not yet available from Congress.gov. When available, the responsible committee will be shown here.' : tooltips.committee}>
            <Box sx={{ mb: 3 }}>
              <CongressionalLabelTooltip type="committee" code={committee}>
                <Chip 
                  label={committee}
                  size="small"
                  sx={{
                    backgroundColor: theme.palette.action.hover,
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 24,
                    borderRadius: 2,
                    cursor: 'help',
                    '&:hover': {
                      backgroundColor: theme.palette.action.selected,
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }
                  }}
                />
              </CongressionalLabelTooltip>
            </Box>
          </Tooltip>
        )}

        {/* Sponsor Information */}
        {meta?.relatedBills && meta.relatedBills.length > 0 && meta.relatedBills[0]?.sponsor && (
          <Box sx={{ mb: 3 }}>
            <Typography component="div" variant="caption" sx={{ 
              color: theme.palette.text.secondary, 
              fontWeight: 600, 
              mb: 0.5, 
              display: 'block' 
            }}>
              Sponsor:
            </Typography>
            <Tooltip content="Click to view sponsor details">
              <Chip
                label={meta?.relatedBills?.[0]?.sponsor || ''}
                size="small"
                clickable
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24,
                  borderRadius: 2,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.selected
                  }
                }}
                onClick={() => {
                  // TODO: Navigate to sponsor details
                  console.log('Sponsor clicked:', meta?.relatedBills?.[0]?.sponsor);
                }}
              />
            </Tooltip>
          </Box>
        )}

        {/* Summary Section */}
        {content.summary && content.summary.trim() && (
          <Box sx={{ mb: 3 }}>
            <Typography component="div" variant="body2" sx={{ 
              color: theme.palette.text.secondary,
              lineHeight: 1.5,
              fontSize: '0.875rem',
              fontStyle: 'italic'
            }}>
              {content.summary}
            </Typography>
          </Box>
        )}

        {/* Key Points */}
        {content.keyPoints.length > 0 && (
          <Box sx={{ mb: 3 }}>
            {content.keyPoints.map((point, index) => (
              <Chip 
                key={index}
                label={point}
                size="small"
                sx={{ 
                  mr: 1, 
                  mb: 1,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? alpha(theme.palette.primary.main, 0.1)
                    : alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.text.secondary,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24,
                  borderRadius: 2
                }}
              />
            ))}
          </Box>
        )}

        {/* Date/Time */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          <Tooltip content={tooltips.date}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Schedule sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
              <Typography component="div" variant="caption" sx={{ 
                color: theme.palette.text.secondary,
                fontWeight: 500
              }}>
                {clientDate || ssrDate}
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        {/* Footer with Action */}
        <Box sx={{ 
          mt: 'auto', 
          pt: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography component="div" variant="caption" sx={{ 
            color: theme.palette.text.secondary,
            fontWeight: 500
          }}>
            Source: {event.source}
          </Typography>
          
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.5
            }}
            onClick={() => {
              if (event.url) {
                window.open(event.url, '_blank');
              }
            }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const theme = useTheme();
  const { isDark } = useDarkMode();
  const { 
    getCardBackground, 
    getAdaptiveBorder, 
    getAdaptiveShadow,
    getAdaptiveBackground, 
    getHoverBackground,
    getSurfaceBackground,
    getTextColor,
    getSkeletonColor
  } = useThemeUtils();
  
  // State for bills and events
  const { bills, loading, error } = useBillsData();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveEventsLoading, setLiveEventsLoading] = useState(false);
  const [liveEventsError, setLiveEventsError] = useState<string | null>(null);
  
  // State for card display limits
  const [billsDisplayLimit, setBillsDisplayLimit] = useState(6);
  const [eventsDisplayLimit, setEventsDisplayLimit] = useState(6);
  const [loadingMoreBills, setLoadingMoreBills] = useState(false);
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);

  // Add chamber filter state
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>('all');

  // Sample live events for fallback
  const sampleLiveEvents = [
    {
      id: 'fallback-1',
      title: 'Sample Committee Hearing on Infrastructure',
      date: new Date().toISOString(),
      type: 'hearing',
      chamber: 'house',
      source: 'congress.gov',
      url: '#',
      description: 'A sample committee hearing to demonstrate the interface.',
      contentId: 'sample-1',
      hasRealSummary: false,
      topics: ['infrastructure', 'transportation'],
      speakers: ['John Doe', 'Jane Smith'],
      bills: ['H.R. 1234'],
      priority: 7,
      committee: 'Transportation and Infrastructure',
      isLiveEvent: false
    },
    {
      id: 'fallback-2',
      title: 'Senate Floor Debate on Climate Bill',
      date: new Date().toISOString(),
      type: 'floor',
      chamber: 'senate',
      source: 'congress.gov',
      url: '#',
      description: 'Senate floor debate on climate change legislation.',
      contentId: 'sample-2',
      hasRealSummary: false,
      topics: ['climate change', 'environment'],
      speakers: ['Senator Johnson', 'Senator Williams'],
      bills: ['S. 5678'],
      priority: 8,
      committee: 'Environment and Public Works',
      isLiveEvent: false
    },
    {
      id: 'fallback-3',
      title: 'House Judiciary Committee Markup',
      date: new Date().toISOString(),
      type: 'markup',
      chamber: 'house',
      source: 'congress.gov',
      url: '#',
      description: 'Committee markup session on criminal justice reform.',
      contentId: 'sample-3',
      hasRealSummary: false,
      topics: ['criminal justice', 'reform'],
      speakers: ['Representative Brown', 'Representative Davis'],
      bills: ['H.R. 9012'],
      priority: 6,
      committee: 'Judiciary',
      isLiveEvent: false
    },
    {
      id: 'fallback-4',
      title: 'House Ways and Means Hearing on Tax Policy',
      date: new Date().toISOString(),
      type: 'hearing',
      chamber: 'house',
      source: 'congress.gov',
      url: '#',
      description: 'House Ways and Means Committee hearing on tax policy reforms.',
      contentId: 'sample-4',
      hasRealSummary: false,
      topics: ['tax policy', 'economic reform'],
      speakers: ['Representative Smith', 'Representative Johnson'],
      bills: ['H.R. 3456'],
      priority: 8,
      committee: 'Ways and Means',
      isLiveEvent: false
    }
  ];

  // Fetch live events from API
  const fetchLiveEvents = async () => {
    setLiveEventsLoading(true);
    setLiveEventsError(null);
    try {
      const url = `/api/discover-content?live=true&days=7&limit=18&intelligence=true`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setLiveEvents(result.data);
      } else {
        console.error('Failed to fetch live events:', result.error);
        setLiveEventsError(result.error || 'Failed to fetch live events');
        // Fallback to sample data
        setLiveEvents(sampleLiveEvents);
      }
    } catch (error) {
      console.error('Error fetching live events:', error);
      setLiveEventsError('Network error while fetching live events');
      // Fallback to sample data
      setLiveEvents(sampleLiveEvents);
    } finally {
      setLiveEventsLoading(false);
    }
  };

  // Fetch live events on component mount
  useEffect(() => {
    fetchLiveEvents();
  }, []);

  const handleRefresh = () => {
    fetchLiveEvents();
  };

  const handleRefreshLiveEvents = () => {
    fetchLiveEvents();
  };

  // Load more functions
  const handleLoadMoreBills = async () => {
    setLoadingMoreBills(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setBillsDisplayLimit(prev => prev + 6);
    setLoadingMoreBills(false);
  };

  const handleLoadMoreEvents = async () => {
    setLoadingMoreEvents(true);
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setEventsDisplayLimit(prev => prev + 6);
    setLoadingMoreEvents(false);
  };

  // Helper functions for live events
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return <Gavel />;
      case 'floor': return <Description />;
      case 'markup': return <Description />;
      default: return <Schedule />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'primary';
      case 'floor': return 'secondary';
      case 'markup': return 'success';
      default: return 'default';
    }
  };

  const getChamberIcon = (chamber: string) => {
    switch (chamber) {
      case 'house': return <Person />;
      case 'senate': return <Person />;
      default: return <Person />;
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString || typeof dateString !== 'string' || !dateString.trim()) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'default';
  };

  // Key players are now fetched in real-time from APIs

  // Filtered bills and events
  const filteredBills = chamberFilter === 'all' ? bills : bills.filter(bill => bill.chamber === chamberFilter);
  const filteredEvents = chamberFilter === 'all' ? liveEvents : liveEvents.filter(event => event.chamber === chamberFilter);

  // Reset display limits when chamber filter changes
  useEffect(() => {
    setBillsDisplayLimit(6);
    setEventsDisplayLimit(6);
  }, [chamberFilter]);

  // Define type for key player
  interface KeyPlayer {
    id: string;
    name: string;
    role: string;
    party: string;
    description: string;
  }

  // Fetch real-time key players (President, VP, Congressional Leaders)
  const [keyPlayers, setKeyPlayers] = useState<KeyPlayer[]>([]);
  const [keyPlayersLoading, setKeyPlayersLoading] = useState<boolean>(true);
  const [keyPlayersError, setKeyPlayersError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKeyPlayers() {
      setKeyPlayersLoading(true);
      setKeyPlayersError(null);
      try {
        // Fetch president and vice president from White House API
        const whiteHouseRes = await fetch('https://www.whitehouse.gov/wp-json/wp/v2/person?per_page=2');
        let president = null;
        let vicePresident = null;
        if (whiteHouseRes.ok) {
          const people: any[] = await whiteHouseRes.json();
          president = people.find((p: any) => p.title && p.title.rendered.toLowerCase().includes('president'));
          vicePresident = people.find((p: any) => p.title && p.title.rendered.toLowerCase().includes('vice president'));
        }
        // Fetch congressional leaders from Congress.gov API (example endpoint, update as needed)
        const congressRes = await fetch('https://api.congress.gov/v3/member/leadership?api_key=' + process.env.NEXT_PUBLIC_CONGRESS_API_KEY);
        let leaders: KeyPlayer[] = [];
        if (congressRes.ok) {
          const data = await congressRes.json();
          leaders = data.members?.map((m: any) => ({
            id: m.bioguideId,
            name: m.name,
            role: m.leadershipTitle,
            party: m.party,
            description: m.description || m.leadershipTitle
          })) || [];
        }
        // Compose the keyPlayers array
        const players = [];
        if (president) players.push({
          id: president.id,
          name: president.title.rendered,
          role: 'President',
          party: 'Unknown',
          description: president.content.rendered
        });
        if (vicePresident) players.push({
          id: vicePresident.id,
          name: vicePresident.title.rendered,
          role: 'Vice President',
          party: 'Unknown',
          description: vicePresident.content.rendered
        });
        setKeyPlayers([...players, ...leaders]);
      } catch (err) {
        setKeyPlayersError('Failed to fetch key players, using fallback.');
        // Fallback to previous mock data
        setKeyPlayers([
          {
            id: '1',
            name: 'Joe Biden',
            role: 'President',
            party: 'D',
            description: 'President of the United States'
          },
          {
            id: '2',
            name: 'Kamala Harris',
            role: 'Vice President',
            party: 'D',
            description: 'Vice President of the United States'
          }
        ]);
      } finally {
        setKeyPlayersLoading(false);
      }
    }
    fetchKeyPlayers();
  }, []);

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="sm">
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }>
            <Typography variant="h6">Unable to load latest events</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.background.default,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        textAlign: 'center', 
        py: { xs: 6, md: 10 },
        px: { xs: 2, md: 4 },
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 50%, ${theme.palette.primary.dark} 100%)`
          : `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 50%, ${theme.palette.primary.light} 100%)`,
        borderRadius: 4,
        mb: 8,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.4"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          zIndex: 0
        }} />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '4rem' },
              fontWeight: 800,
              background: theme.palette.mode === 'dark'
                ? `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.error.main})`
                : `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark}, ${theme.palette.error.dark})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 3,
              lineHeight: 1.2
            }}
          >
            Know Your Vote Kentucky
          </Typography>
          
          <Typography
            variant="h2"
            component="h2"
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 4,
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.4
            }}
          >
            Stay aware of what&apos;s happening on the hill.
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', md: '1.125rem' },
              color: theme.palette.text.secondary,
              mb: 6,
              maxWidth: '600px',
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Track Congressional activity, processed into plain language with AI
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2, 
            justifyContent: 'center',
            alignItems: 'center',
            mb: 4
          }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<EventIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                }
              }}
              onClick={() => {
                document.getElementById('events-section')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              Track Events
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<Description />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 3,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2,
                  transform: 'translateY(-2px)',
                }
              }}
              onClick={() => {
                document.getElementById('bills-section')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              Track Bills
            </Button>
          </Box>

          {/* Stats */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 4, 
            justifyContent: 'center',
            alignItems: 'center',
            mt: 6
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                {bills.length}+
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                Active Bills
              </Typography>
            </Box>
            
            <Box sx={{ 
              width: { xs: '50px', sm: '1px' }, 
              height: { xs: '1px', sm: '50px' }, 
              bgcolor: theme.palette.divider 
            }} />
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                {liveEvents.length}+
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                Recent Events
              </Typography>
            </Box>
            
            <Box sx={{ 
              width: { xs: '50px', sm: '1px' }, 
              height: { xs: '1px', sm: '50px' }, 
              bgcolor: theme.palette.divider 
            }} />
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                Live
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                Real-time Updates
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* About Section */}
      <Box sx={{ 
        textAlign: 'center', 
        py: { xs: 4, md: 6 },
        px: { xs: 2, md: 4 },
        mb: 8
      }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            mb: 4,
            color: theme.palette.text.primary,
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            fontWeight: 700,
          }}
        >
          Making Congress Accessible
        </Typography>
        
        <Typography
          variant="body1"
          sx={{
            fontSize: { xs: '1rem', md: '1.125rem' },
            color: theme.palette.text.secondary,
            maxWidth: '800px',
            mx: 'auto',
            lineHeight: 1.7,
            mb: 4
          }}
        >
          Know Your Vote Kentucky transforms complex legislative language into clear, actionable insights.
          We track bills, hearings, and legislative events in real-time, using AI to
          break down what matters and why it matters to you.
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4, 
          justifyContent: 'center',
          alignItems: 'center',
          mt: 4
        }}>
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: theme.palette.primary.main,
              mb: 1
            }}>
              Real-time Updates
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Live congressional activity from official sources
            </Typography>
          </Box>
          
          <Box sx={{ 
            width: { xs: '50px', md: '1px' }, 
            height: { xs: '1px', md: '50px' }, 
            bgcolor: theme.palette.divider 
          }} />
          
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: theme.palette.secondary.main,
              mb: 1
            }}>
              AI-Powered Analysis
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Complex legislation explained in plain language
            </Typography>
          </Box>
          
          <Box sx={{ 
            width: { xs: '50px', md: '1px' }, 
            height: { xs: '1px', md: '50px' }, 
            bgcolor: theme.palette.divider 
          }} />
          
          <Box sx={{ textAlign: 'center', flex: 1 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              color: theme.palette.success.main,
              mb: 1
            }}>
              Stay Informed
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              Track what&apos;s happening on Capitol Hill
            </Typography>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ py: 6, flex: 1 }}>
        <Grid container spacing={4}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            {/* Recent Activity Section */}
            <Box sx={{ mb: 8 }}>
        <Typography
          variant="h2"
          component="h2"
          sx={{
            textAlign: 'center',
            mb: 8,
            color: theme.palette.text.primary,
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 700,
          }}
        >
          Recent Congressional Activity
        </Typography>

        {/* Recent Bills */}
        <Box id="bills-section" sx={{ mb: 8 }}>
          {/* Chamber Subnav Toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <ButtonGroup variant="outlined" size="small" sx={{ borderRadius: 2 }} aria-label="Filter bills by chamber">
              <Button
                variant={chamberFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('all')}
                aria-label="Show both House and Senate bills"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'all' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                  backgroundColor: chamberFilter === 'all' ? theme.palette.primary.main : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'all' ? theme.palette.primary.dark : theme.palette.action.hover,
                  },
                }}
              >
                Both
              </Button>
              <Button
                variant={chamberFilter === 'house' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('house')}
                aria-label="Show House bills"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'house'
                    ? theme.palette.primary.contrastText
                    : `${theme.palette.text.primary} !important`,
                  backgroundColor: chamberFilter === 'house'
                    ? theme.palette.primary.main
                    : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'house'
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                House
              </Button>
              <Button
                variant={chamberFilter === 'senate' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('senate')}
                aria-label="Show Senate bills"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'senate'
                    ? theme.palette.primary.contrastText
                    : `${theme.palette.text.primary} !important`,
                  backgroundColor: chamberFilter === 'senate'
                    ? theme.palette.primary.main
                    : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'senate'
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                Senate
              </Button>
            </ButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography
              variant="h3"
              component="h3"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '1.75rem',
                fontWeight: 700,
              }}
            >
              Latest Bills
            </Typography>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForward />}
              onClick={() => router.push('/bills')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              View All Bills
            </Button>
          </Box>
          
          {loading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card sx={{
                    height: '100%',
                    backgroundColor: getCardBackground(),
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.08)', '0 2px 12px rgba(255,255,255,0.08)'),
                    borderRadius: 3,
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        height: 24, 
                        bgcolor: getSkeletonColor(), 
                        mb: 2, 
                        borderRadius: 1,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 20, 
                        bgcolor: getSkeletonColor(), 
                        mb: 1, 
                        borderRadius: 1, 
                        width: '60%',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 16, 
                        bgcolor: getSkeletonColor(), 
                        mb: 2, 
                        borderRadius: 1,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 16, 
                        bgcolor: getSkeletonColor(), 
                        borderRadius: 1, 
                        width: '40%',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : filteredBills.length === 0 ? (
            <Card sx={{
              bgcolor: getCardBackground(),
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Info sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.primary }}>
                  No bills available for this chamber
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Check back later for updates from Congress.gov
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Grid container spacing={3}>
                {filteredBills.slice(0, billsDisplayLimit).map((bill) => (
                  <Grid item xs={12} md={4} key={bill.id}>
                    <BillCard 
                      bill={bill} 
                      onClick={() => router.push(`/bills/${bill.id}`)}
                    />
                  </Grid>
                ))}
              </Grid>
              
              {/* Load More Button for Bills */}
              {filteredBills.length > billsDisplayLimit && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleLoadMoreBills}
                    disabled={loadingMoreBills}
                    startIcon={loadingMoreBills ? <CircularProgress size={20} /> : <ArrowForward />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    {loadingMoreBills ? 'Loading...' : `Load More Bills (${filteredBills.length - billsDisplayLimit} remaining)`}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Recent Events */}
        <Box id="events-section" sx={{ mb: 8 }}>
          {/* Chamber Subnav Toolbar (repeat for events) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <ButtonGroup variant="outlined" size="small" sx={{ borderRadius: 2 }} aria-label="Filter events by chamber">
              <Button
                variant={chamberFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('all')}
                aria-label="Show both House and Senate events"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'all' ? theme.palette.primary.contrastText : theme.palette.text.primary,
                  backgroundColor: chamberFilter === 'all' ? theme.palette.primary.main : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'all' ? theme.palette.primary.dark : theme.palette.action.hover,
                  },
                }}
              >
                Both
              </Button>
              <Button
                variant={chamberFilter === 'house' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('house')}
                aria-label="Show House events"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'house'
                    ? theme.palette.primary.contrastText
                    : `${theme.palette.text.primary} !important`,
                  backgroundColor: chamberFilter === 'house'
                    ? theme.palette.primary.main
                    : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'house'
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                House
              </Button>
              <Button
                variant={chamberFilter === 'senate' ? 'contained' : 'outlined'}
                onClick={() => setChamberFilter('senate')}
                aria-label="Show Senate events"
                sx={{
                  textTransform: 'capitalize',
                  fontWeight: 600,
                  color: chamberFilter === 'senate'
                    ? theme.palette.primary.contrastText
                    : `${theme.palette.text.primary} !important`,
                  backgroundColor: chamberFilter === 'senate'
                    ? theme.palette.primary.main
                    : 'transparent',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    backgroundColor: chamberFilter === 'senate'
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                Senate
              </Button>
            </ButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Typography
              variant="h3"
              component="h3"
              sx={{
                color: theme.palette.text.primary,
                fontSize: '1.75rem',
                fontWeight: 700,
              }}
            >
              Recent Events
            </Typography>
            <Button
              variant="outlined"
              size="small"
              endIcon={<ArrowForward />}
              onClick={() => router.push('/events')}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              View All Events
            </Button>
          </Box>
          
          {liveEventsLoading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid item xs={12} md={4} key={i}>
                  <Card sx={{
                    height: '100%',
                    backgroundColor: getCardBackground(),
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.08)', '0 2px 12px rgba(255,255,255,0.08)'),
                    borderRadius: 3,
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        height: 24, 
                        bgcolor: getSkeletonColor(), 
                        mb: 2, 
                        borderRadius: 1,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 20, 
                        bgcolor: getSkeletonColor(), 
                        mb: 1, 
                        borderRadius: 1, 
                        width: '60%',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 16, 
                        bgcolor: getSkeletonColor(), 
                        mb: 2, 
                        borderRadius: 1,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                      <Box sx={{ 
                        height: 16, 
                        bgcolor: getSkeletonColor(), 
                        borderRadius: 1, 
                        width: '40%',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : liveEventsError ? (
            <Card sx={{
              bgcolor: getCardBackground(),
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Error sx={{ fontSize: 48, color: theme.palette.error.main, mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.primary }}>
                  Unable to load recent events
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 2 }}>
                  {liveEventsError}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRefreshLiveEvents}
                  sx={{ borderRadius: 2 }}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card sx={{
              bgcolor: getCardBackground(),
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Info sx={{ fontSize: 48, color: theme.palette.info.main, mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1, color: theme.palette.text.primary }}>
                  No events available for this chamber
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Check back later for updates from Congress.gov
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Grid container spacing={3}>
                {filteredEvents.slice(0, eventsDisplayLimit).map((event) => (
                  <Grid item xs={12} md={4} key={event.id}>
                    <EventCard event={event} />
                  </Grid>
                ))}
              </Grid>
              
              {/* Load More Button for Events */}
              {filteredEvents.length > eventsDisplayLimit && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleLoadMoreEvents}
                    disabled={loadingMoreEvents}
                    startIcon={loadingMoreEvents ? <CircularProgress size={20} /> : <ArrowForward />}
                    sx={{
                      borderRadius: 3,
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    {loadingMoreEvents ? 'Loading...' : `Load More Events (${filteredEvents.length - eventsDisplayLimit} remaining)`}
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Key Players */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h3"
          component="h3"
          sx={{
            mb: 3,
            color: theme.palette.text.primary,
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          Key Players
        </Typography>
        <Grid container spacing={3}>
          {keyPlayers.slice(0, 6).map((player) => (
            <Grid item xs={12} sm={6} md={4} key={player.id}>
              <Card sx={{
                bgcolor: getCardBackground(),
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.08)', '0 2px 12px rgba(255,255,255,0.08)'),
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: getAdaptiveShadow('0 8px 32px rgba(0,0,0,0.12)', '0 8px 32px rgba(255,255,255,0.12)'),
                  transform: 'translateY(-2px)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      mr: 2, 
                      bgcolor: player.party === 'D' ? theme.palette.primary.main : 
                              player.party === 'R' ? theme.palette.error.main : 
                              theme.palette.warning.main 
                    }}>
                      {player.name.split(' ').map((n: string) => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h4" sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600 
                      }}>
                        {player.name}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.text.secondary 
                      }}>
                        {player.role} ({player.party})
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.text.secondary 
                  }}>
                    {player.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: 'sticky', top: 24 }}>
              {/* Trending Bills Sidebar */}
              <Box sx={{ mb: 4 }}>
                <TrendingBillsSidebar 
                  maxBills={5}
                  rotationInterval={5000}
                  onBillClick={(bill) => {
                    console.log('Trending bill clicked:', bill);
                    // You can implement navigation or search here
                  }}
                />
              </Box>

              {/* Calendar View */}
              <Box>
                <CalendarView 
                  view="month"
                  onEventClick={(event) => {
                    console.log('Calendar event clicked:', event);
                    // You can implement navigation or modal here
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

