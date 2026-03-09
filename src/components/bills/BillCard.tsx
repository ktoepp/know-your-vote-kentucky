'use client';

import React, { useState } from 'react';
import { Card, CardContent, Typography, Chip, Box, LinearProgress, Avatar, Button, Accordion, AccordionSummary, AccordionDetails, useTheme, IconButton, Collapse, Divider, Tooltip as MuiTooltip } from '@mui/material';
import { TrendingUp, Schedule, Flag, AccountBalance, Star, ArrowForward, ExpandMore, Person, Description, Home, Business } from '@mui/icons-material';
import { governmentTooltips, billStatusExplanations } from '@/lib/tooltipContent';
import { LegislativeProcess } from '../../app/components/LegislativeProcess';
import { getLegislativeStagesForEvent } from '../../lib/billStages';
import { useThemeUtils } from '@/components/ui/ThemeUtils';
import { Bill } from '@/app/lib/useBillsData';
import { Tooltip } from '@/components/ui/Tooltip';
import { BillTooltip, BillNumberTooltip } from '@/components/ui/BillTooltip';
import { normalizeRepresentativeName } from '../../lib/name-utils';
import { alpha } from '@mui/material/styles';
import { generateBillContent } from '@/lib/content-generation';
import { useTheme as useMuiTheme } from '@mui/material/styles';

/**
 * Props interface for the BillCard component
 */
export interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
}

/**
 * BillCard Component
 * 
 * Displays a congressional bill in a card format with key information including:
 * - Bill number and chamber
 * - Bill title
 * - Committee information
 * - Sponsor details
 * - Last action and date
 * - Expandable details section
 * 
 * @param props - Component props containing bill data and optional click handler
 * @returns JSX element representing a bill card
 */
export default function BillCard({ bill, onClick }: BillCardProps) {
  const theme = useMuiTheme();
  const { getAdaptiveBorder, getCardBackground, getSurfaceBackground, getAdaptiveShadow } = useThemeUtils();
  const [expanded, setExpanded] = useState(false);

  // Generate enhanced content using the new utilities
  const content = generateBillContent(bill, {
    targetAudience: 'general',
    includeEducationalContext: true,
    standardizeLengths: true,
    targetTitleLength: 135,
    targetSummaryLength: 210,
    targetKeyPointsCount: 3,
    ensureCompleteThoughts: true
  });

  const getUrgencyColor = (priority?: number) => {
    if (!priority) return 'default';
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  const getUrgencyStyle = (priority?: number) => {
    if (!priority) return {};
    if (priority >= 8) {
      return {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText
      };
    }
    if (priority >= 6) {
      return {
        backgroundColor: theme.palette.warning.main,
        color: theme.palette.warning.contrastText
      };
    }
    return {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.success.contrastText
    };
  };

  const getProgressStage = (actions?: Array<{ actionDate: string; text: string }>) => {
    if (!actions || actions.length === 0) return 10;
    if (actions.length === 1) return 25;
    if (actions.length <= 3) return 50;
    if (actions.length <= 5) return 75;
    return 90;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  /**
   * Formats a bill number with appropriate prefix (S. for Senate, H.R. for House)
   * @param bill - The bill object containing number and chamber information
   * @returns Formatted bill number string (e.g., "S. 1234" or "H.R. 5678")
   */
  const formatBillNumber = (bill: Bill) => {
    if (!bill.number) return 'Unknown Bill';
    const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
    return `${prefix} ${bill.number}`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
  const standardizeTitleLength = (title: string, targetLength: number = 90, minLength: number = 60, maxLength: number = 120): string => {
    if (!title) return 'Untitled Bill';
    
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
        return `Congressional Bill: ${cleanTitle}`;
      }
      
      return cleanTitle; // Keep moderately short titles
    }
    
    // If title is too long, return it as is without truncation
    // This ensures full titles are always displayed
    return cleanTitle;
  };

  /**
   * Generates concise, relevant titles for congressional bills
   * Creates engaging titles that highlight the main purpose of each bill
   * Focuses on the substance of legislation rather than procedural language
   * 
   * @param bill - The bill object containing title and metadata
   * @returns A concise, engaging title for the bill
   */
  const generateBillTitle = (bill: BillCardProps['bill']): string => {
    if (!bill.title) return 'Untitled Bill';
    let title = bill.title.trim();

    // Handle resolution patterns more intelligently
    if (title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)/i)) {
      // Extract the action and subject
      const match = title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\s+(.+)/i);
      if (match) {
        const action = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        let subject = match[2];
        
        // Clean up the subject and focus on the substance
        subject = subject
          .replace(/, and for other purposes\.?$/i, '')
          .replace(/for other purposes\.?$/i, '')
          .replace(/\.$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Handle date patterns in quotes
        subject = subject.replace(/["""](\d{1,2}\/\d{1,2}\/\d{4})["""]/g, '$1');
        subject = subject.replace(/["""](\d{4}-\d{2}-\d{2})["""]/g, '$1');
        
        // Handle "the week of" patterns
        if (subject.match(/^the week of/i)) {
          subject = subject.replace(/^the week of\s+/i, 'Week of ');
        }
        
        // Handle "the month of" patterns
        if (subject.match(/^the month of/i)) {
          subject = subject.replace(/^the month of\s+/i, 'Month of ');
        }
        
        // Handle "the day of" patterns
        if (subject.match(/^the day of/i)) {
          subject = subject.replace(/^the day of\s+/i, 'Day of ');
        }
        
        // Handle "the designation of" patterns - focus on what's being designated
        if (subject.match(/^the designation of/i)) {
          subject = subject.replace(/^the designation of\s+/i, '');
        }
        
        // Handle "the recognition of" patterns - focus on what's being recognized
        if (subject.match(/^the recognition of/i)) {
          subject = subject.replace(/^the recognition of\s+/i, '');
        }
        
        // Capitalize first letter of subject
        subject = subject.charAt(0).toUpperCase() + subject.slice(1);
        
        // If the action is redundant with the subject, just use the subject
        if (subject.toLowerCase().includes(action.toLowerCase())) {
          title = subject;
        } else {
          title = `${action} ${subject}`;
        }
      }
    }
    // Handle patterns that start with action words (like "Supporting", "Recognizing", etc.)
    else if (title.match(/^(Supporting|Recognizing|Designating|Establishing|Condemning|Honoring|Celebrating|Expressing|Commending|Congratulating)/i)) {
      // Extract the action and subject
      const match = title.match(/^(Supporting|Recognizing|Designating|Establishing|Condemning|Honoring|Celebrating|Expressing|Commending|Congratulating)\s+(.+)/i);
      if (match) {
        const action = match[1];
        let subject = match[2];
        
        // Clean up the subject and focus on the substance
        subject = subject
          .replace(/, and for other purposes\.?$/i, '')
          .replace(/for other purposes\.?$/i, '')
          .replace(/\.$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Handle date patterns in quotes
        subject = subject.replace(/["""](\d{1,2}\/\d{1,2}\/\d{4})["""]/g, '$1');
        subject = subject.replace(/["""](\d{4}-\d{2}-\d{2})["""]/g, '$1');
        
        // Handle "the week of" patterns
        if (subject.match(/^the week of/i)) {
          subject = subject.replace(/^the week of\s+/i, 'Week of ');
        }
        
        // Handle "the month of" patterns
        if (subject.match(/^the month of/i)) {
          subject = subject.replace(/^the month of\s+/i, 'Month of ');
        }
        
        // Handle "the day of" patterns
        if (subject.match(/^the day of/i)) {
          subject = subject.replace(/^the day of\s+/i, 'Day of ');
        }
        
        // Handle "the designation of" patterns - focus on what's being designated
        if (subject.match(/^the designation of/i)) {
          subject = subject.replace(/^the designation of\s+/i, '');
        }
        
        // Handle "the recognition of" patterns - focus on what's being recognized
        if (subject.match(/^the recognition of/i)) {
          subject = subject.replace(/^the recognition of\s+/i, '');
        }
        
        // Capitalize first letter of subject
        subject = subject.charAt(0).toUpperCase() + subject.slice(1);
        
        // If the action is redundant with the subject, just use the subject
        if (subject.toLowerCase().includes(action.toLowerCase())) {
          title = subject;
        } else {
          title = `${action} ${subject}`;
        }
      }
    }
    // Handle bill patterns - focus on the substance
    else if (title.match(/^A bill to /i)) {
      title = title
        .replace(/^A bill to /i, '')
        .replace(/, and for other purposes\.?$/i, '')
        .replace(/for other purposes\.?$/i, '')
        .replace(/\.$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    // Handle joint resolution patterns - focus on the substance
    else if (title.match(/^A joint resolution /i)) {
      title = title
        .replace(/^A joint resolution /i, '')
        .replace(/, and for other purposes\.?$/i, '')
        .replace(/for other purposes\.?$/i, '')
        .replace(/\.$/, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    // Handle other patterns - focus on the substance
    else {
      // Remove boilerplate language and focus on content
      title = title
        .replace(/^To /i, '')
        .replace(/^A resolution /i, '')
        .replace(/, and for other purposes\.?$/i, '')
        .replace(/for other purposes\.?$/i, '')
        .replace(/\.$/, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Clean up any remaining quotes and extra punctuation
    title = title
      .replace(/["""]/g, '')
      .replace(/\.{2,}/g, '')
      .replace(/\.$/, '')
      .replace(/^[,\s]+/, '')
      .replace(/[,\s]+$/, '')
      .trim();

    // Standardize the title length
    return standardizeTitleLength(title);
  };

  /**
   * Generates concise, relevant summaries for congressional bills
   * Creates engaging summaries that highlight the main purpose of each bill
   * 
   * @param bill - The bill object containing title, summary, and metadata
   * @returns A concise, engaging summary for the bill
   */
  const generateBillSummary = (bill: BillCardProps['bill']): string => {
    // Use existing summary if it's concise and relevant
    if (bill.summary && bill.summary.length <= 150 && !bill.summary.includes('A bill to')) {
      return bill.summary;
    }

    // Generate summary from title if no summary exists
    if (bill.title) {
      let summary = '';
      const title = bill.title.trim();
      
      // Handle resolution patterns
      if (title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)/i)) {
        const match = title.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\s+(.+)/i);
        if (match) {
          const action = match[1];
          let subject = match[2];
          
          // Clean up the subject
          subject = subject
            .replace(/, and for other purposes\.?$/i, '')
            .replace(/for other purposes\.?$/i, '')
            .replace(/\.$/, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Handle date patterns in quotes
          subject = subject.replace(/["""](\d{1,2}\/\d{1,2}\/\d{4})["""]/g, '$1');
          subject = subject.replace(/["""](\d{4}-\d{2}-\d{2})["""]/g, '$1');
          
          // Handle "the week of" patterns
          if (subject.match(/^the week of/i)) {
            subject = subject.replace(/^the week of\s+/i, 'Week of ');
          }
          
          // Handle "the month of" patterns
          if (subject.match(/^the month of/i)) {
            subject = subject.replace(/^the month of\s+/i, 'Month of ');
          }
          
          // Handle "the day of" patterns
          if (subject.match(/^the day of/i)) {
            subject = subject.replace(/^the day of\s+/i, 'Day of ');
          }
          
          // Capitalize first letter of subject
          subject = subject.charAt(0).toUpperCase() + subject.slice(1);
          
          // Create contextual summary for resolutions
          const actionMap: Record<string, string> = {
            'designating': 'Designates',
            'supporting': 'Expresses support for',
            'recognizing': 'Recognizes',
            'establishing': 'Establishes',
            'condemning': 'Condemns',
            'honoring': 'Honors',
            'celebrating': 'Celebrates'
          };
          
          const actionText = actionMap[action] || action;
          summary = `This resolution ${actionText.toLowerCase()} ${subject.toLowerCase()}. Congressional resolutions express the sense of Congress but do not have the force of law.`;
        }
      }
      // Handle patterns that start with action words
      else if (title.match(/^(Supporting|Recognizing|Designating|Establishing|Condemning|Honoring|Celebrating|Expressing|Commending|Congratulating)/i)) {
        const match = title.match(/^(Supporting|Recognizing|Designating|Establishing|Condemning|Honoring|Celebrating|Expressing|Commending|Congratulating)\s+(.+)/i);
        if (match) {
          const action = match[1];
          let subject = match[2];
          
          // Clean up the subject
          subject = subject
            .replace(/, and for other purposes\.?$/i, '')
            .replace(/for other purposes\.?$/i, '')
            .replace(/\.$/, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Handle date patterns in quotes
          subject = subject.replace(/["""](\d{1,2}\/\d{1,2}\/\d{4})["""]/g, '$1');
          subject = subject.replace(/["""](\d{4}-\d{2}-\d{2})["""]/g, '$1');
          
          // Handle "the week of" patterns
          if (subject.match(/^the week of/i)) {
            subject = subject.replace(/^the week of\s+/i, 'Week of ');
          }
          
          // Handle "the month of" patterns
          if (subject.match(/^the month of/i)) {
            subject = subject.replace(/^the month of\s+/i, 'Month of ');
          }
          
          // Handle "the day of" patterns
          if (subject.match(/^the day of/i)) {
            subject = subject.replace(/^the day of\s+/i, 'Day of ');
          }
          
          // Handle "the designation of" patterns
          if (subject.match(/^the designation of/i)) {
            subject = subject.replace(/^the designation of\s+/i, 'Designation of ');
          }
          
          // Handle "the recognition of" patterns
          if (subject.match(/^the recognition of/i)) {
            subject = subject.replace(/^the recognition of\s+/i, 'Recognition of ');
          }
          
          // Capitalize first letter of subject
          subject = subject.charAt(0).toUpperCase() + subject.slice(1);
          
          // Create contextual summary for action-based titles
          const actionMap: Record<string, string> = {
            'Supporting': 'Expresses support for',
            'Recognizing': 'Recognizes',
            'Designating': 'Designates',
            'Establishing': 'Establishes',
            'Condemning': 'Condemns',
            'Honoring': 'Honors',
            'Celebrating': 'Celebrates',
            'Expressing': 'Expresses',
            'Commending': 'Commends',
            'Congratulating': 'Congratulates'
          };
          
          const actionText = actionMap[action] || action;
          summary = `This legislation ${actionText.toLowerCase()} ${subject.toLowerCase()}. This appears to be a congressional resolution or commemorative legislation.`;
        }
      }
      // Handle bill patterns
      else if (title.match(/^A bill to /i)) {
        let billContent = title
          .replace(/^A bill to /i, '')
          .replace(/, and for other purposes\.?$/i, '')
          .replace(/for other purposes\.?$/i, '')
          .replace(/\.$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Capitalize first letter
        billContent = billContent.charAt(0).toUpperCase() + billContent.slice(1);
        
        summary = `This legislation would ${billContent.toLowerCase()}. Bills require passage by both chambers and presidential signature to become law.`;
      }
      // Handle joint resolution patterns
      else if (title.match(/^A joint resolution /i)) {
        let resolutionContent = title
          .replace(/^A joint resolution /i, '')
          .replace(/, and for other purposes\.?$/i, '')
          .replace(/for other purposes\.?$/i, '')
          .replace(/\.$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Capitalize first letter
        resolutionContent = resolutionContent.charAt(0).toUpperCase() + resolutionContent.slice(1);
        
        summary = `This joint resolution ${resolutionContent.toLowerCase()}. Joint resolutions require passage by both chambers and presidential signature to become law.`;
      }
      // Handle other patterns
      else {
        summary = title
          .replace(/^To /i, '')
          .replace(/^A resolution /i, '')
          .replace(/^A bill to /i, '')
          .replace(/^A joint resolution /i, '')
          .replace(/, and for other purposes\.?$/i, '')
          .replace(/for other purposes\.?$/i, '')
          .replace(/\.$/, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Capitalize first letter
        summary = summary.charAt(0).toUpperCase() + summary.slice(1);
      }

      // Clean up any remaining quotes and extra punctuation
      summary = summary
        .replace(/["""]/g, '')
        .replace(/\.{2,}/g, '')
        .replace(/\.$/, '')
        .replace(/^[,\s]+/, '')
        .replace(/[,\s]+$/, '')
        .trim();

      return summary;
    }

    // Fallback summary
    const chamberName = bill.chamber === 'senate' ? 'Senate' : 'House';
    return `${chamberName} bill ${bill.number || ''}`.trim();
  };

  // Enhanced chip styling functions
  const getChamberChipProps = (chamber?: string) => {
    if (!chamber) return { label: 'Unknown', color: 'default' as const, bgColor: theme.palette.background.paper, textColor: theme.palette.text.primary };
    
    const chamberConfig = {
      house: { 
        label: 'House', 
        color: 'primary' as const, 
        bgColor: theme.palette.primary.main,
        textColor: theme.palette.primary.contrastText
      },
      senate: { 
        label: 'Senate', 
        color: 'secondary' as const, 
        bgColor: theme.palette.secondary.main,
        textColor: theme.palette.secondary.contrastText
      }
    };
    
    return chamberConfig[chamber as keyof typeof chamberConfig] || { 
      label: chamber, 
      color: 'default' as const, 
      bgColor: theme.palette.background.paper,
      textColor: theme.palette.text.primary
    };
  };

  /**
   * Generates styling and content properties for sponsor chips
   * Handles name formatting, party colors, and clickable behavior
   * 
   * @param sponsor - Sponsor information (string or object with name/party/state)
   * @returns Object containing label, background color, text color, and click handler
   */
  const getSponsorChipProps = (sponsor?: BillCardProps['bill']['sponsor']) => {
    if (!sponsor) return null;
    
    // Extract party from sponsor name or use default
    const party = typeof sponsor === 'object' ? sponsor.party : 'Unknown';
    let name = typeof sponsor === 'object' ? sponsor.name : sponsor;

    // Normalize the name using the utility function
    if (name) {
      name = normalizeRepresentativeName(name);
    }

    // Determine colors based on party affiliation
    const bgColor = party === 'R' ? '#fee2e2' : party === 'D' ? '#dbeafe' : theme.palette.action.hover;
    const textColor = party === 'R' ? '#dc2626' : party === 'D' ? '#2563eb' : theme.palette.text.primary;

    return {
      label: name || 'Unknown Sponsor',
      bgColor,
      textColor,
      onClick: () => {
        // TODO: Navigate to sponsor details page
        console.log('Sponsor clicked:', sponsor);
      }
    };
  };

  /**
   * Determines the current legislative stage based on bill actions
   * @param actions - Array of bill actions
   * @returns Current stage information
   */
  const getCurrentLegislativeStage = (actions?: Array<{ actionDate: string; text: string }>) => {
    if (!actions || actions.length === 0) {
      return {
        stage: 'introduced',
        label: 'Introduced',
        description: 'Bill has been introduced but no further action has been taken',
        progress: 10
      };
    }

    const lastAction = actions[0].text.toLowerCase();
    
    // Map actions to stages
    if (lastAction.includes('introduced')) {
      return {
        stage: 'introduced',
        label: 'Introduced',
        description: 'Bill has been officially submitted to Congress and assigned a number',
        progress: 15
      };
    } else if (lastAction.includes('referred') && lastAction.includes('committee')) {
      return {
        stage: 'referred',
        label: 'Referred to Committee',
        description: 'Bill has been assigned to a committee for detailed review and consideration',
        progress: 25
      };
    } else if (lastAction.includes('hearing')) {
      return {
        stage: 'hearing',
        label: 'Committee Hearing',
        description: 'Committee is holding public hearings to gather information and testimony',
        progress: 35
      };
    } else if (lastAction.includes('markup')) {
      return {
        stage: 'markup',
        label: 'Committee Markup',
        description: 'Committee is reviewing the bill line by line and considering amendments',
        progress: 45
      };
    } else if (lastAction.includes('reported') || lastAction.includes('ordered to be reported')) {
      return {
        stage: 'reported',
        label: 'Reported from Committee',
        description: 'Committee has finished reviewing and recommends the bill for floor consideration',
        progress: 55
      };
    } else if (lastAction.includes('placed on calendar') || lastAction.includes('calendar')) {
      return {
        stage: 'calendar',
        label: 'On Floor Calendar',
        description: 'Bill is scheduled for consideration by the full chamber',
        progress: 65
      };
    } else if (lastAction.includes('debate') || lastAction.includes('floor')) {
      return {
        stage: 'debate',
        label: 'Floor Debate',
        description: 'Members are debating the bill on the chamber floor',
        progress: 75
      };
    } else if (lastAction.includes('passed') || lastAction.includes('agreed to')) {
      return {
        stage: 'passed',
        label: 'Passed Chamber',
        description: 'Bill has been approved by this chamber and sent to the other chamber',
        progress: 85
      };
    } else if (lastAction.includes('enrolled') || lastAction.includes('enacted')) {
      return {
        stage: 'enrolled',
        label: 'Enrolled',
        description: 'Both chambers have passed identical versions and bill is ready for presidential action',
        progress: 95
      };
    } else if (lastAction.includes('signed') || lastAction.includes('became law')) {
      return {
        stage: 'enacted',
        label: 'Enacted into Law',
        description: 'President has signed the bill and it is now law',
        progress: 100
      };
    } else if (lastAction.includes('vetoed')) {
      return {
        stage: 'vetoed',
        label: 'Vetoed',
        description: 'President has rejected the bill. Congress can override with 2/3 vote',
        progress: 90
      };
    }
    
    // Default fallback
    return {
      stage: 'in_progress',
      label: 'In Progress',
      description: 'Bill is moving through the legislative process',
      progress: 50
    };
  };

  const chamberChip = getChamberChipProps(bill.chamber);
  const sponsorChip = getSponsorChipProps(bill.sponsor);

  const getLegislativeStageIcon = (stage: string) => {
    switch (stage) {
      case 'introduced':
        return <Description fontSize="small" />;
      case 'referred':
        return <Schedule fontSize="small" />;
      case 'hearing':
        return <Flag fontSize="small" />;
      case 'markup':
        return <TrendingUp fontSize="small" />;
      case 'reported':
        return <AccountBalance fontSize="small" />;
      case 'calendar':
        return <Schedule fontSize="small" />;
      case 'debate':
        return <Flag fontSize="small" />;
      case 'passed':
        return <Flag fontSize="small" />;
      case 'enrolled':
        return <AccountBalance fontSize="small" />;
      case 'enacted':
        return <Star fontSize="small" />;
      case 'vetoed':
        return <Flag fontSize="small" />;
      default:
        return <Description fontSize="small" />;
    }
  };

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 3,
        border: `1px solid ${getAdaptiveBorder('#e2e8f0', '#333333')}`,
        backgroundColor: getCardBackground(),
        boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.08)', '0 2px 12px rgba(255,255,255,0.08)'),
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: getAdaptiveShadow('0 4px 16px rgba(0,0,0,0.15)', '0 4px 20px rgba(255,255,255,0.15)'),
          backgroundColor: theme.palette.action.hover
        } : {},
        position: 'relative',
        overflow: 'visible'
      }}
    >
      <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: getSurfaceBackground() }}>
        {/* Header with Bill Number, Current Stage, and Chamber - All on Same Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          {/* Bill Number - Left */}
          <BillNumberTooltip billNumber={formatBillNumber(bill)}>
            <Chip
              label={formatBillNumber(bill)}
              size="small"
              clickable
              icon={<Description fontSize="small" sx={{ color: 'inherit' }} />}
              sx={{
                backgroundColor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.light
                  : theme.palette.primary.main,
                fontWeight: 700,
                fontSize: '0.875rem',
                height: 28,
                borderRadius: 2,
                cursor: 'help',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.primary.main, 0.15),
                  boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.1)', '0 2px 8px rgba(255,255,255,0.1)')
                },
                '& .MuiChip-icon': {
                  color: 'inherit'
                }
              }}
            />
          </BillNumberTooltip>
          
          {/* Current Stage - Center */}
          <Tooltip content={getCurrentLegislativeStage(bill.actions).description}>
            <Chip
              label={getCurrentLegislativeStage(bill.actions).label}
              size="small"
              icon={React.cloneElement(getLegislativeStageIcon(getCurrentLegislativeStage(bill.actions).stage), { 
                sx: { color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main } 
              })}
              sx={{
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.main, 0.7)
                  : alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.mode === 'dark'
                  ? theme.palette.primary.contrastText
                  : theme.palette.primary.main,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                borderRadius: 2,
                cursor: 'help',
                boxShadow: getAdaptiveShadow('0 1px 4px rgba(0,0,0,0.08)', '0 1px 4px rgba(255,255,255,0.3)'),
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.85)
                    : alpha(theme.palette.primary.main, 0.18),
                },
                '& .MuiChip-icon': {
                  color: theme.palette.mode === 'dark'
                    ? theme.palette.primary.contrastText
                    : theme.palette.primary.main,
                }
              }}
            />
          </Tooltip>
          
          {/* Chamber Designation - Right */}
          <Chip
            label={chamberChip.label}
            size="small"
            icon={React.cloneElement(chamberChip.label === 'Senate' ? <AccountBalance fontSize="small" /> : <Home fontSize="small" />, { 
              sx: { color: 'inherit' } 
            })}
            sx={{
              backgroundColor: chamberChip.bgColor,
              color: chamberChip.textColor,
              fontWeight: 600,
              fontSize: '0.75rem',
              height: 24,
              borderRadius: 2,
              '& .MuiChip-icon': {
                color: 'inherit'
              }
            }}
          />
        </Box>

        {/* Title */}
        <Typography variant="body1" sx={{ 
          fontWeight: 600, 
          lineHeight: 1.4, 
          mb: 2,
          color: theme.palette.text.primary,
          wordBreak: 'break-word' // Better than truncation for long titles
        }}>
          {content.title}
        </Typography>

        {/* Summary */}
        <Typography variant="body2" sx={{ 
          lineHeight: 1.4, 
          mb: 3,
          color: theme.palette.text.secondary,
          fontStyle: 'italic',
          fontSize: '0.875rem',
          wordBreak: 'break-word' // Better than truncation for long summaries
        }}>
          {content.summary}
        </Typography>

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

        {/* Committee and Sponsor */}
        <Box sx={{ mb: 3 }}>
          {bill.committees && bill.committees.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ 
                color: theme.palette.text.disabled, 
                fontWeight: 400, 
                mb: 0.5, 
                display: 'block',
                fontSize: '0.65rem',
                opacity: 0.6
              }}>
                Committee:
              </Typography>
              <Tooltip content="Click to view committee details">
                <Chip
                  label={bill.committees[0]}
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
                      backgroundColor: theme.palette.action.selected,
                      transform: 'translateY(-1px)',
                      boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.1)', '0 2px 8px rgba(255,255,255,0.1)')
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add committee detail navigation
                    console.log('Committee clicked:', bill.committees?.[0]);
                  }}
                />
              </Tooltip>
            </Box>
          )}

          {sponsorChip && (
            <Box>
              <Typography variant="caption" sx={{ 
                color: theme.palette.text.disabled, 
                fontWeight: 400, 
                mb: 0.5, 
                display: 'block',
                fontSize: '0.65rem',
                opacity: 0.6
              }}>
                Sponsor:
              </Typography>
              <Tooltip content="Click to view sponsor details">
                <Chip
                  label={sponsorChip.label}
                  size="small"
                  clickable
                  sx={{
                    backgroundColor: sponsorChip.bgColor,
                    color: sponsorChip.textColor,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 24,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: sponsorChip.bgColor === '#fee2e2' ? '#fecaca' : 
                                   sponsorChip.bgColor === '#dbeafe' ? '#bfdbfe' : 
                                   theme.palette.action.selected
                    }
                  }}
                  onClick={sponsorChip.onClick}
                />
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Enhanced Progress Bar with Current Stage */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Tooltip content={getCurrentLegislativeStage(bill.actions).description}>
              <Typography variant="caption" sx={{ 
                fontWeight: 400, 
                cursor: 'help', 
                color: theme.palette.text.disabled,
                fontSize: '0.65rem',
                opacity: 0.6
              }}>
                Legislative Progress
                <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.75 }}>ⓘ</span>
              </Typography>
            </Tooltip>
            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.secondary }}>
              {getCurrentLegislativeStage(bill.actions).progress}%
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={getCurrentLegislativeStage(bill.actions).progress}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: theme.palette.divider,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                boxShadow: getAdaptiveShadow('0 1px 3px rgba(0,0,0,0.2)', '0 1px 3px rgba(255,255,255,0.2)')
              }
            }}
          />
        </Box>

        {/* Latest Action and Actions Timeline (Accordion) */}
        {bill.actions && bill.actions.length > 0 && (
          <Accordion 
            expanded={expanded} 
            onChange={() => setExpanded(!expanded)}
            sx={{ 
              mb: 3,
              boxShadow: expanded ? getAdaptiveShadow('0 2px 8px rgba(30,64,175,0.10)', '0 2px 8px rgba(30,64,175,0.15)') : 'none',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                margin: 0,
                marginBottom: 3
              }
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{
                minHeight: 48,
                px: 2.5,
                py: 2,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
                  : `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
                borderRadius: 2.5,
                width: '100%',
                boxShadow: expanded ? getAdaptiveShadow('0 2px 8px rgba(30,64,175,0.10)', '0 2px 8px rgba(30,64,175,0.15)') : 'none',
                '& .MuiAccordionSummary-content': {
                  margin: '4px 0',
                  alignItems: 'center',
                  display: 'flex',
                  gap: 2.5,
                  width: '100%',
                },
                '& .MuiAccordionSummary-expandIconWrapper': {
                  color: theme.palette.text.secondary,
                  fontSize: '1rem'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 120 }}>
                <Flag sx={{ fontSize: '1.1rem', color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.main, letterSpacing: 0.2 }}>
                  Latest Action
                  <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.75 }}>ⓘ</span>
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 3, borderColor: theme.palette.divider, height: 28 }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, lineHeight: 1.4, fontSize: '0.85rem', ml: 1, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', alignSelf: 'center' }}>
                {truncateText(bill.actions[0].text, 80)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 2, px: 0 }}>
              <Box sx={{ px: 2 }}>
                <Typography variant="caption" sx={{ 
                  fontWeight: 400, 
                  color: theme.palette.text.disabled, 
                  mb: 1, 
                  display: 'block',
                  fontSize: '0.65rem',
                  opacity: 0.6
                }}>
                  Full Timeline:
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', borderLeft: `3px solid ${theme.palette.primary.light}`, pl: 2, mt: 1 }}>
                  {bill.actions.map((action, index) => {
                    // Determine stage for each action
                    const actionStage = getCurrentLegislativeStage([action]);
                    return (
                      <Box key={index} sx={{ 
                        mb: 1.5, 
                        p: 1, 
                        borderRadius: 1, 
                        bgcolor: index % 2 === 0 ? theme.palette.action.hover : 'transparent',
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        position: 'relative',
                      }}>
                        <Box sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: theme.palette.primary.main,
                          position: 'absolute',
                          left: -22,
                          top: 12,
                          border: `2px solid ${theme.palette.background.paper}`
                        }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, display: 'block' }}>
                              {formatDate(action.actionDate)}
                            </Typography>
                            <Tooltip content={actionStage.description}>
                              <Chip
                                label={actionStage.label}
                                size="small"
                                variant="outlined"
                                sx={{
                                  backgroundColor: alpha(theme.palette.primary.light, 0.15),
                                  color: theme.palette.primary.main,
                                  borderColor: theme.palette.primary.light,
                                  fontWeight: 500,
                                  fontSize: '0.65rem',
                                  height: 18,
                                  borderRadius: 1,
                                  cursor: 'help',
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.light, 0.25),
                                  }
                                }}
                              />
                            </Tooltip>
                          </Box>
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                            {action.text}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Footer with Date and Action */}
        <Box sx={{ 
          mt: 'auto', 
          pt: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Schedule sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
              Introduced: {bill.introduced_date ? formatDate(bill.introduced_date) : 'Unknown date'}
            </Typography>
          </Box>
          
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForward />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.5,
              px: 1.5,
              color: theme.palette.primary.main,
              borderColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                borderColor: theme.palette.primary.main
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