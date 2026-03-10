'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Grid
} from '@mui/material';
import {
  Refresh,
  OpenInNew,
  Schedule,
  LocationOn,
  Group,
  Description,
  TrendingUp,
  NewReleases,
  FilterList,
  Settings,
  Download,
  Share,
  Bookmark,
  BookmarkBorder,
  Visibility,
  PlayArrow,
  Gavel,
  Business,
  School,
  Security,
  HealthAndSafety,
  AccountBalance,
  LocalShipping,
  Science,
  Agriculture,
  Home,
  Work,
  Public,
  AttachMoney,
  Policy,
  Person,
  Search,
  ArrowForward,
  LiveTv,
  CheckCircle,
  AccessTime,
  ExpandLess,
  ExpandMore,
  ViewModule,
  ViewList,
  ViewComfy,
  Event,
  EventNote,
  Add
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import PoliticalIntelligenceCard from '../components/PoliticalIntelligenceCard';
import { useBillsData, Bill } from '../lib/useBillsData';
import { getLegislativeStagesForEvent } from '../../lib/billStages';
import { governmentTooltips } from '@/lib/tooltipContent';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import type { ChipProps } from '@mui/material';
import { Tooltip } from '@/components/ui/Tooltip';

interface LiveEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  committee?: string;
  billType?: string;
  status?: string;
  relevanceScore: number;
  actions?: Array<{ actionDate: string; text: string; actionBy?: string; chamber?: string; }>;
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
    relevanceScore?: number;
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
    eventStatus?: 'live' | 'upcoming' | 'completed';
    startTime?: string;
    endTime?: string;
    duration?: string | number;
    location?: string;
    venue?: string;
    isLiveEvent?: boolean;
    source?: string;
    lastUpdated?: string;
    mediaCoverage?: {
      ket?: string;
      youtube?: string;
      transcript?: string;
    };
    expectedOutcomes?: string[];
    historicalContext?: string;
    tags?: string[];
    sponsor?: {
      fullName: string;
      party: string;
      state: string;
      district?: string;
    };
    cosponsors?: Array<{
      fullName: string;
      party: string;
      state: string;
      district?: string;
    }>;
    actions?: Array<{
      actionDate: string;
      text: string;
      actionBy?: string;
      chamber?: string;
    }>;
    witnesses?: Array<{
      fullName: string;
      organization?: string;
      position?: string;
    }>;
    subjects?: string[];
  };
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

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

// Utility function to get concise, meaningful title for events
const getEventShortTitle = (event: LiveEvent) => {
  const title = event.title;
  
  // Extract bill number if available
  let billNumber = '';
  if (event.metadata?.relatedBills && event.metadata.relatedBills.length > 0) {
    billNumber = event.metadata.relatedBills[0].number;
  }
  
  const billPrefix = event.metadata?.chamber === 'senate' ? 'S.' : 'H.R.';
  const formattedBillNumber = billNumber ? `${billPrefix} ${billNumber}` : '';
  
  // Remove common verbose prefixes and rewrite more concisely
  let conciseTitle = title;
  
  // Handle resolution patterns - make more concise
  if (conciseTitle.match(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)/i)) {
    conciseTitle = conciseTitle.replace(/^A resolution (designating|supporting|recognizing|establishing|condemning|honoring|celebrating)\s+/i, '');
  }
  
  // Handle bill patterns - make more concise
  if (conciseTitle.match(/^A bill to /i)) {
    conciseTitle = conciseTitle.replace(/^A bill to /i, '');
  }
  
  // Remove "and for other purposes" and similar phrases
  conciseTitle = conciseTitle.replace(/\s+and for other purposes\.?$/i, '');
  conciseTitle = conciseTitle.replace(/\s+and for other purposes$/i, '');
  
  // Remove "congratulating" and "expressing support" for resolutions
  conciseTitle = conciseTitle.replace(/^(congratulating|expressing support for)\s+/i, '');
  
  // Remove "for winning" and similar phrases
  conciseTitle = conciseTitle.replace(/\s+for winning\s+/i, ' wins ');
  
  // Clean up quotes and extra punctuation
  conciseTitle = conciseTitle.replace(/["""]/g, '');
  conciseTitle = conciseTitle.replace(/\.{2,}/g, '');
  conciseTitle = conciseTitle.replace(/\.$/, ''); // Remove trailing period
  
  // Clean up extra spaces and trim
  conciseTitle = conciseTitle.replace(/\s+/g, ' ').trim();
  
  // Add bill number prefix if available
  if (formattedBillNumber) {
    conciseTitle = `${formattedBillNumber}: ${conciseTitle}`;
  }
  
  return conciseTitle;
};

// Utility function to reformat name from "Sen. Ernst, Joni [R-IA]" to "Joni Ernst"
const formatName = (fullName: string) => {
  // Remove brackets and their contents
  const cleanName = fullName.replace(/\[.*?\]/g, '');
  
  // Remove title prefixes like "Sen.", "Rep.", etc.
  const withoutTitle = cleanName.replace(/^(Sen\.|Rep\.|Del\.|Res\.)\s+/i, '');
  
  // Handle "Lastname, Firstname" format
  if (withoutTitle.includes(',')) {
    const parts = withoutTitle.split(',');
    if (parts.length >= 2) {
      const lastName = parts[0].trim();
      const firstName = parts[1].trim();
      return `${firstName} ${lastName}`;
    }
  }
  
  // If no comma, return as is (already in "Firstname Lastname" format)
  return withoutTitle.trim();
};

// Utility function to generate enhanced summary
const getEnhancedSummary = (event: LiveEvent) => {
  // If we already have a good description, use it as a base
  let baseSummary = '';
  if (event.description && event.description.length > 50) {
    baseSummary = event.description;
  }
  
  // Generate a focused summary that avoids repeating UI information
  const parts: string[] = [];
  
  // Start with the base summary if available
  if (baseSummary) {
    parts.push(baseSummary);
  }
  
  // Add unique context that's NOT already visible in the UI
  // Skip sponsor info, cosponsor count, dates, and committee info as they're shown elsewhere
  
  // Add policy context based on title keywords (unique insight)
  const title = event.title?.toLowerCase() || '';
  const policyContext: string[] = [];
  
  if (title.includes('education') || title.includes('school')) {
    policyContext.push('education policy');
  }
  if (title.includes('health') || title.includes('medical')) {
    policyContext.push('healthcare');
  }
  if (title.includes('economy') || title.includes('economic') || title.includes('business')) {
    policyContext.push('economic policy');
  }
  if (title.includes('environment') || title.includes('climate')) {
    policyContext.push('environmental policy');
  }
  if (title.includes('defense') || title.includes('military')) {
    policyContext.push('defense policy');
  }
  if (title.includes('immigration')) {
    policyContext.push('immigration policy');
  }
  if (title.includes('tax') || title.includes('revenue')) {
    policyContext.push('tax policy');
  }
  
  if (policyContext.length > 0) {
    parts.push(`Addresses ${policyContext.join(', ')}`);
  }
  
  // Add resolution vs bill context (unique explanation)
  if (title.includes('resolution')) {
    parts.push('This is a legislative resolution expressing the sense of the Kentucky General Assembly');
  } else if (title.includes('bill')) {
    parts.push('This legislation would require passage by both chambers and the Governor\'s signature to become law');
  }
  
  // Add action history context (only if not already shown in UI)
  if (event.metadata?.actions && event.metadata.actions.length > 0) {
    const recentActions = event.metadata.actions.slice(0, 2); // Show last 2 actions for context
    if (recentActions.length > 0) {
      const actionDescriptions = recentActions.map(action => {
        let desc = action.text;
        if (action.actionBy) {
          desc += ` by ${action.actionBy}`;
        }
        return desc;
      });
      parts.push(`Recent actions: ${actionDescriptions.join('; ')}`);
    }
  }
  
  // Add subjects/topics if available (unique information)
  if (event.metadata?.subjects && event.metadata.subjects.length > 0) {
    const subjectList = event.metadata.subjects.slice(0, 3).join(', ');
    parts.push(`Topics: ${subjectList}`);
  }
  
  // Combine all parts with proper formatting
  let enhancedSummary = parts.join('. ');
  
  // If we don't have a base summary, use the title as context
  if (!baseSummary && event.title) {
    enhancedSummary = `${event.title}. ${enhancedSummary}`;
  }
  
  // Clean up and ensure proper punctuation
  enhancedSummary = enhancedSummary.replace(/\.{2,}/g, '.');
  enhancedSummary = enhancedSummary.replace(/\.$/, '');
  
  return enhancedSummary;
};

// Add a helper for DD/MM format
const formatDateDDMM = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${String(day).padStart(2, '0')}`;
};

type EventTypeColor = ChipProps['color'];

const eventTypeMeta: Record<string, { label: string; icon: React.ReactElement; color: EventTypeColor }> = {
  bill: { label: 'Bill', icon: <Description fontSize="small" />, color: 'primary' },
  hearing: { label: 'Hearing', icon: <Gavel fontSize="small" />, color: 'secondary' },
  floor: { label: 'Floor', icon: <AccountBalance fontSize="small" />, color: 'info' },
  nomination: { label: 'Nomination', icon: <Person fontSize="small" />, color: 'success' },
  meeting: { label: 'Meeting', icon: <EventNote fontSize="small" />, color: 'warning' },
  session: { label: 'Session', icon: <Group fontSize="small" />, color: 'default' },
};

const getEventTypeMeta = (type: string): { label: string; icon: React.ReactElement; color: EventTypeColor } => {
  if (type === 'markup') return eventTypeMeta.bill;
  if (type in eventTypeMeta) return eventTypeMeta[type as keyof typeof eventTypeMeta];
  return { label: type.charAt(0).toUpperCase() + type.slice(1), icon: <EventNote fontSize="small" />, color: 'default' };
};

export default function LiveContentPage() {
  const theme = useMuiTheme();
  const router = useRouter();
  const { bills, loading: billsLoading } = useBillsData();
  
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [daysBack, setDaysBack] = useState(7);
  const [limit, setLimit] = useState(20);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showOnlyHighPriority, setShowOnlyHighPriority] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<'all' | 'house' | 'senate'>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'hearing' | 'floor' | 'markup'>('all');
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [userState, setUserState] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState(false);
  
  // New state for subnavigation
  const [columnLayout, setColumnLayout] = useState<'1' | '2' | '3'>('3');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'senate' | 'house'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [eventCategory, setEventCategory] = useState<'all' | 'bill' | 'hearing' | 'floor' | 'nomination' | 'meeting' | 'session'>('all');

  const fetchLiveContent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/discover-content?live=true&days=${daysBack}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: LiveContentResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch live content');
      }
      
      if (!data.hasLiveData) {
        throw new Error('No live data available. Please check your API configuration.');
      }
      
      setLiveEvents(data.data);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Error fetching live content:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveContent();
  }, [daysBack, limit]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleRefresh = () => {
    fetchLiveContent();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return <Gavel />;
      case 'floor': return <Business />;
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
      case 'house': return <Home />;
      case 'senate': return <AccountBalance />;
      default: return <Public />;
    }
  };

  const getCommitteeIcon = (committee?: string) => {
    if (!committee) return <Group />;
    
    const committeeLower = committee.toLowerCase();
    if (committeeLower.includes('judiciary')) return <Gavel />;
    if (committeeLower.includes('intelligence')) return <Security />;
    if (committeeLower.includes('finance')) return <AttachMoney />;
    if (committeeLower.includes('appropriations')) return <Policy />;
    if (committeeLower.includes('education')) return <School />;
    if (committeeLower.includes('health')) return <HealthAndSafety />;
    if (committeeLower.includes('transportation')) return <LocalShipping />;
    if (committeeLower.includes('science')) return <Science />;
    if (committeeLower.includes('agriculture')) return <Agriculture />;
    if (committeeLower.includes('energy')) return <TrendingUp />;
    if (committeeLower.includes('commerce')) return <Work />;
    
    return <Group />;
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

  const filteredEvents = liveEvents.filter(event => {
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.metadata?.bills && event.metadata.bills.some(bill => bill.toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesChamber = chamberFilter === 'all' || 
      (event.metadata?.chamber && event.metadata.chamber.toLowerCase() === chamberFilter.toLowerCase());
    
    const matchesCategory = eventCategory === 'all' ||
      (event.type === 'markup' && eventCategory === 'bill') ||
      event.type === eventCategory;
    
    return matchesSearch && matchesChamber && matchesCategory;
  });

  const currentEvents = filteredEvents.filter(event => {
    if (showOnlyHighPriority && event.metadata?.priority !== 'high') return false;
    return true;
  });

  const groupedEvents = {
    all: currentEvents,
    hearings: currentEvents.filter(event => event.type === 'hearing'),
    floor: currentEvents.filter(event => event.type === 'floor'),
    markup: currentEvents.filter(event => event.type === 'markup')
  };

  const handleViewEvent = (event: LiveEvent) => {
    router.push(`/events/${event.id}`);
  };

  const handleProcessContent = (event: LiveEvent) => {
    router.push(`/upload?contentId=${event.id}&source=${event.metadata?.source || 'legislature.ky.gov'}`);
  };

  const handleSearch = (query: string) => {
    // Navigate to search page with query
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'error';
      case 'upcoming': return 'warning';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <LiveTv />;
      case 'upcoming': return <Schedule />;
      case 'completed': return <CheckCircle />;
      default: return <Schedule />;
    }
  };

  const sortedEvents = [...currentEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'relevance':
        return (b.metadata?.relevanceScore || 0) - (a.metadata?.relevanceScore || 0);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityA = priorityOrder[a.metadata?.priority as keyof typeof priorityOrder] || 1;
        const priorityB = priorityOrder[b.metadata?.priority as keyof typeof priorityOrder] || 1;
        return priorityB - priorityA;
      default:
        return 0;
    }
  });

  const EnhancedEventCard = ({ event }: { event: LiveEvent }) => {
    const duration = event.metadata?.duration;
    const time = event.metadata?.startTime;
    const location = event.metadata?.location;
    const venue = event.metadata?.venue;
    const status = event.status;
    const relatedBills = event.metadata?.relatedBills;
    const mediaCoverage = event.metadata?.mediaCoverage;

    // Unified process stages
    const stages = getLegislativeStagesForEvent(event);
    const currentStage = stages.find(s => s.status === 'current');

    return (
      <Card sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '1px solid',
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          borderColor: theme.palette.primary.main
        }
      }}>
        <CardContent sx={{ flexGrow: 1, p: 3, backgroundColor: 'inherit', color: 'inherit' }}>
          {/* Header with Related Bill, Event Type, and Chamber - All on Same Row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            {/* Related Bill Number - Left */}
            {event.metadata?.relatedBills && event.metadata.relatedBills.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {event.metadata.relatedBills.slice(0, 2).map((bill, index) => (
                  <Tooltip key={`bill-${bill.number}-${index}`} content={`View details for ${bill.number}`}>
                    <Chip
                      label={bill.number}
                      size="small"
                      clickable
                      icon={<Description fontSize="small" sx={{ color: 'inherit' }} />}
                      sx={{
                        backgroundColor: theme.palette.info.light,
                        color: theme.palette.info.contrastText,
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        height: 28,
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.info.main,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        },
                        '& .MuiChip-icon': {
                          color: 'inherit'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Add bill detail navigation
                        console.log('Bill clicked:', bill.number);
                      }}
                    />
                  </Tooltip>
                ))}
                {event.metadata.relatedBills.length > 2 && (
                  <Tooltip content={`View ${event.metadata.relatedBills.length - 2} more related bills`}>
                    <Chip
                      label={`+${event.metadata.relatedBills.length - 2}`}
                      size="small"
                      icon={<Add fontSize="small" sx={{ color: 'inherit' }} />}
                      sx={{
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 24,
                        borderRadius: 2,
                        '& .MuiChip-icon': {
                          color: 'inherit'
                        }
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            )}
            
            {/* Event Type/Stage - Center */}
            <Chip
              icon={getEventTypeMeta(event.type).icon}
              label={getEventTypeMeta(event.type).label}
              size="small"
              color={getEventTypeMeta(event.type).color}
              variant="outlined"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
                '& .MuiChip-icon': {
                  color: 'inherit'
                }
              }}
            />
            
            {/* Chamber Label - Right */}
            {event.metadata?.chamber && (
              <Tooltip content={`${event.metadata.chamber.charAt(0).toUpperCase() + event.metadata.chamber.slice(1)} chamber`}>
                <Chip 
                  label={event.metadata.chamber.charAt(0).toUpperCase() + event.metadata.chamber.slice(1)}
                  size="small"
                  icon={React.cloneElement(event.metadata.chamber === 'house' ? <Home fontSize="small" /> : <AccountBalance fontSize="small" />, { 
                    sx: { color: 'inherit' } 
                  })}
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: '0.75rem', 
                    height: 24,
                    backgroundColor: event.metadata.chamber === 'senate' ? theme.palette.secondary.main : theme.palette.primary.main,
                    color: event.metadata.chamber === 'senate' ? theme.palette.secondary.contrastText : theme.palette.primary.contrastText,
                    borderRadius: 2,
                    '& .MuiChip-icon': {
                      color: 'inherit'
                    }
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Header with Status and Type */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            {event.metadata?.eventStatus && (
              <Chip 
                icon={getStatusIcon(event.metadata.eventStatus)}
                label={event.metadata.eventStatus === 'live' ? 'LIVE NOW' : 
                       event.metadata.eventStatus === 'upcoming' ? 'UPCOMING' : 'COMPLETED'}
                size="small"
                color={getStatusColor(event.metadata.eventStatus)}
                sx={{ 
                  animation: event.metadata.eventStatus === 'live' ? 'pulse 2s infinite' : 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24,
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 },
                  }
                }}
              />
            )}
          </Box>
          
          {/* Title */}
          <Typography variant="h6" sx={{ 
            color: 'text.primary', 
            mb: 1.5, 
            fontWeight: 600,
            lineHeight: 1.3
          }}>
            {getEventShortTitle(event)}
          </Typography>
          
          {/* Summary - Moved to expandable details */}
          
          {/* Timeline */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400, mb: 1, display: 'block', fontSize: '0.7rem' }}>
              LEGISLATIVE PROCESS
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25, overflow: 'auto', '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {stages.map((stage, index) => (
                <React.Fragment key={stage.key}>
                  <Tooltip 
                    content={governmentTooltips[`timeline_${stage.key}`]?.content || stage.label}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, minWidth: '45px', flexShrink: 0, cursor: 'help' }}>
                      <Box sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '0.65rem', 
                        fontWeight: 600, 
                        backgroundColor: stage.status === 'completed' ? 'success.main' : stage.status === 'current' ? 'primary.main' : 'action.disabledBackground', 
                        color: stage.status === 'completed' ? 'success.contrastText' : stage.status === 'current' ? 'primary.contrastText' : 'text.disabled', 
                        border: '2px solid', 
                        borderColor: stage.status === 'completed' ? 'success.main' : stage.status === 'current' ? 'primary.main' : 'divider', 
                        position: 'relative',
                        boxShadow: stage.status === 'current' ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                      }}>
                        {stage.status === 'completed' ? '✓' : stage.status === 'current' ? (index + 1) : '○'}
                      </Box>
                      <Typography variant="caption" sx={{ 
                        fontSize: '0.55rem', 
                        textAlign: 'center', 
                        lineHeight: 1,
                        color: stage.status === 'completed' ? 'success.main' : stage.status === 'current' ? 'primary.main' : 'text.secondary',
                        fontWeight: stage.status === 'current' ? 600 : 400
                      }}>
                        {stage.label}
                      </Typography>
                      {stage.date && (
                        <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'text.disabled', mt: 0.25 }}>
                          {formatDateDDMM(stage.date)}
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                  {index < stages.length - 1 && (
                    <Box sx={{ 
                      width: 12, 
                      height: 1, 
                      backgroundColor: stage.status === 'completed' ? 'success.main' : 'divider', 
                      flexShrink: 0 
                    }} />
                  )}
                </React.Fragment>
              ))}
            </Box>
          </Box>

          {status && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                STATUS:
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{status}</Typography>
            </Box>
          )}
          {(time || location || venue) && (
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {time && <Chip icon={<Schedule />} label={`Time: ${time}`} size="small" />}
            </Box>
          )}

          {/* Key Topics */}
          {event.metadata?.keyTopics && event.metadata.keyTopics.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                KEY TOPICS:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {event.metadata.keyTopics.slice(0, 4).map((topic, index) => (
                  <Chip 
                    key={index}
                    label={topic} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 20,
                      fontWeight: 500
                    }}
                  />
                ))}
                {event.metadata.keyTopics.length > 4 && (
                  <Chip 
                    label={`+${event.metadata.keyTopics.length - 4} more`} 
                    size="small" 
                    variant="outlined"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: 20,
                      fontWeight: 500
                    }}
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Expandable Details */}
          <Box sx={{ mt: 'auto' }}>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ mb: 1 }}
            >
              {expanded ? 'Show Less' : 'Show Details'}
            </Button>
            
            {expanded && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                
                {/* Description/Summary */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}>
                    DESCRIPTION:
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    lineHeight: 1.5,
                    color: 'text.secondary',
                    bgcolor: 'action.disabledBackground',
                    p: 2,
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}>
                    {getEnhancedSummary(event)}
                  </Typography>
                </Box>
                
                {/* Sponsor */}
                {event.metadata?.sponsor && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      SPONSOR:
                    </Typography>
                    <Tooltip content={`Click to view ${event.metadata.sponsor.fullName}'s profile`}>
                      <Chip 
                        label={`${event.metadata.sponsor.fullName} (${event.metadata.sponsor.party}-${event.metadata.sponsor.state}${event.metadata.sponsor.district ? '-' + event.metadata.sponsor.district : ''})`} 
                        size="small"
                        variant="outlined"
                        color={event.metadata.sponsor.party === 'D' ? 'primary' : event.metadata.sponsor.party === 'R' ? 'error' : 'warning'}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main'
                          }
                        }}
                        onClick={() => router.push(`/members?search=${encodeURIComponent(event.metadata!.sponsor!.fullName)}`)}
                      />
                    </Tooltip>
                  </Box>
                )}

                {/* Cosponsors */}
                {event.metadata?.cosponsors && event.metadata.cosponsors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      COSPONSORS:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {event.metadata.cosponsors.slice(0, 3).map((cosponsor: any, i: number) => (
                        <Tooltip key={i} content={`Click to view ${cosponsor.fullName}'s profile`}>
                          <Chip 
                            label={`${cosponsor.fullName} (${cosponsor.party}-${cosponsor.state}${cosponsor.district ? '-' + cosponsor.district : ''})`} 
                            size="small"
                            variant="outlined"
                            color={cosponsor.party === 'D' ? 'primary' : cosponsor.party === 'R' ? 'error' : 'warning'}
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                                borderColor: 'primary.main'
                              }
                            }}
                            onClick={() => router.push(`/members?search=${encodeURIComponent(cosponsor.fullName)}`)}
                          />
                        </Tooltip>
                      ))}
                      {event.metadata.cosponsors.length > 3 && <Chip label={`+${event.metadata.cosponsors.length - 3} more`} size="small" />}
                    </Box>
                  </Box>
                )}

                {/* Actions */}
                {event.metadata?.actions && event.metadata.actions.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      ACTIONS:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {event.metadata.actions.slice(0, 3).map((a, i) => (
                        <li key={i}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {a.actionDate}: {a.text} ({a.actionBy}, {a.chamber})
                          </Typography>
                        </li>
                      ))}
                      {event.metadata.actions.length > 3 && <li><Typography variant="caption" sx={{ color: 'text.disabled' }}>...and {event.metadata.actions.length - 3} more</Typography></li>}
                    </ul>
                  </Box>
                )}

                {/* Witnesses */}
                {event.metadata?.witnesses && event.metadata.witnesses.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      WITNESSES:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {event.metadata.witnesses.slice(0, 3).map((w, i) => (
                        <Chip key={i} label={`${w.fullName}${w.organization ? ', ' + w.organization : ''}${w.position ? ', ' + w.position : ''}`} size="small" />
                      ))}
                      {event.metadata.witnesses.length > 3 && <Chip label={`+${event.metadata.witnesses.length - 3} more`} size="small" />}
                    </Box>
                  </Box>
                )}

                {/* Subjects */}
                {event.metadata?.subjects && event.metadata.subjects.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      SUBJECTS:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {event.metadata.subjects.slice(0, 4).map((s, i) => <Chip key={i} label={s} size="small" />)}
                      {event.metadata.subjects.length > 4 && <Chip label={`+${event.metadata.subjects.length - 4} more`} size="small" />}
                    </Box>
                  </Box>
                )}

                {/* Related Bills */}
                {relatedBills && relatedBills.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      RELATED BILLS:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {relatedBills.slice(0, 2).map((b, i) => (
                        <Tooltip content="Click to view bill details" key={b.number || i}>
                          <Chip
                            label={formatBillNumber(b)}
                            size="small"
                            clickable
                            sx={{
                              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
                              color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              height: 28,
                              borderRadius: 2,
                              cursor: 'pointer',
                              border: `1px solid ${theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.main}`,
                              '&:hover': {
                                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                              }
                            }}
                            onClick={() => {
                              // TODO: Add bill detail navigation
                              console.log('Bill number clicked:', b.number);
                            }}
                          />
                        </Tooltip>
                      ))}
                      {relatedBills.length > 2 && <Chip label={`+${relatedBills.length - 2} more`} size="small" />}
                    </Box>
                  </Box>
                )}

                {/* Media Coverage */}
                {mediaCoverage && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ 
                      color: 'text.disabled', 
                      fontWeight: 400, 
                      mb: 1, 
                      display: 'block',
                      fontSize: '0.65rem',
                      opacity: 0.6
                    }}>
                      MEDIA COVERAGE:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {mediaCoverage.ket && <Chip label="KET" component="a" href={mediaCoverage.ket} target="_blank" clickable size="small" />}
                      {mediaCoverage.youtube && <Chip label="YouTube" component="a" href={mediaCoverage.youtube} target="_blank" clickable size="small" />}
                      {mediaCoverage.transcript && <Chip label="Transcript" component="a" href={mediaCoverage.transcript} target="_blank" clickable size="small" />}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Political Intelligence */}
          {showIntelligence && event.politicalIntelligence && (
            <PoliticalIntelligenceCard politicalIntelligence={event.politicalIntelligence} />
          )}
        </CardContent>
        
        <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
          <Box display="flex" gap={1}>
            <Button 
              size="small" 
              variant="outlined"
              startIcon={<ArrowForward />}
              onClick={() => window.location.href = `/explore?focus=${event.id}`}
            >
              View in Graph
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            {event.metadata?.eventStatus === 'live' && (
              <Tooltip content="Watch Live">
                <IconButton size="small" color="error">
                  <LiveTv />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      </Card>
    );
  };

  // Get column layout props
  const getColumnProps = () => {
    switch (columnLayout) {
      case '1': return { xs: 12 };
      case '2': return { xs: 12, md: 6 };
      case '3': return { xs: 12, sm: 6, md: 4 };
      default: return { xs: 12, sm: 6, md: 4 };
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Only render the real content after loading is false and data is available
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Live Kentucky Legislative Content
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Real-time updates from the Kentucky General Assembly with intelligent analysis and clear explanations
        </Typography>
      </Box>

      {/* Subnavigation Bar */}
      <Paper sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 2, 
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between'
        }}>
          {/* Left side - Search and Filters */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: 2, 
            flex: 1 
          }}>
            {/* Search */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'action.disabledBackground',
              borderRadius: 1,
              px: 2,
              py: 1,
              flex: 1,
              maxWidth: { xs: '100%', sm: 300 }
            }}>
              <Search sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
              <input
                type="text"
                placeholder="Search live events and bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: theme.palette.text.primary,
                  fontSize: '0.875rem',
                  width: '100%'
                }}
              />
            </Box>

            {/* Chamber Filter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['all', 'senate', 'house'] as const).map((chamber) => (
                  <Button
                    key={chamber}
                    size="small"
                    variant={chamberFilter === chamber ? 'contained' : 'outlined'}
                    onClick={() => setChamberFilter(chamber)}
                    sx={{ 
                      fontSize: '0.75rem',
                      textTransform: 'capitalize',
                      minWidth: 'auto',
                      px: 1.5
                    }}
                  >
                    {chamber === 'all' ? 'Both' : chamber}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Event Category Filter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterList sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['all', 'bill', 'hearing', 'floor', 'nomination', 'meeting', 'session'] as const).map((cat) => (
                  <Button
                    key={cat}
                    size="small"
                    variant={eventCategory === cat ? 'contained' : 'outlined'}
                    onClick={() => setEventCategory(cat)}
                    startIcon={cat !== 'all' ? eventTypeMeta[cat === 'bill' ? 'bill' : cat]?.icon : null}
                    sx={{ fontSize: '0.75rem', textTransform: 'capitalize', minWidth: 'auto', px: 1.5 }}
                  >
                    {cat === 'all' ? 'All' : eventTypeMeta[cat === 'bill' ? 'bill' : cat]?.label}
                  </Button>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Right side - Layout and Theme */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            justifyContent: { xs: 'center', md: 'flex-end' }
          }}>
            {/* Column Layout Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tooltip content="1 Column Layout">
                <IconButton
                  size="small"
                  onClick={() => setColumnLayout('1')}
                  color={columnLayout === '1' ? 'primary' : 'default'}
                  sx={{ 
                    bgcolor: columnLayout === '1' ? 'primary.50' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ViewList />
                </IconButton>
              </Tooltip>
              <Tooltip content="2 Column Layout">
                <IconButton
                  size="small"
                  onClick={() => setColumnLayout('2')}
                  color={columnLayout === '2' ? 'primary' : 'default'}
                  sx={{ 
                    bgcolor: columnLayout === '2' ? 'primary.50' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ViewComfy />
                </IconButton>
              </Tooltip>
              <Tooltip content="3 Column Layout">
                <IconButton
                  size="small"
                  onClick={() => setColumnLayout('3')}
                  color={columnLayout === '3' ? 'primary' : 'default'}
                  sx={{ 
                    bgcolor: columnLayout === '3' ? 'primary.50' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <ViewModule />
                </IconButton>
              </Tooltip>
            </Box>

          </Box>
        </Box>

        {/* Results Summary */}
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            Showing {filteredEvents.length} of {liveEvents.length} events
            {searchQuery && ` matching "${searchQuery}"`}
            {chamberFilter !== 'all' && ` in ${chamberFilter === 'senate' ? 'Senate' : 'House'}`}
          </Typography>
        </Box>
      </Paper>

      {/* Intelligence Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Button
          variant={showIntelligence ? "contained" : "outlined"}
          onClick={() => setShowIntelligence(!showIntelligence)}
          startIcon={<TrendingUp />}
          sx={{ borderRadius: 2 }}
        >
          {showIntelligence ? 'Hide' : 'Show'} Political Intelligence
        </Button>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Live Events Grid */}
      {!loading && !error && (
        <Box>
          {filteredEvents.length === 0 ? (
            <Box textAlign="center" py={8}>
              <LiveTv sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchQuery || chamberFilter !== 'all' 
                  ? 'No events match your filters' 
                  : 'No live events currently'
                }
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery || chamberFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Check back later for the latest legislative activity.'
                }
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredEvents.map((event, index) => {
                // Use index as the primary key to ensure uniqueness
                const uniqueKey = `event-${index}`;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={uniqueKey}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Chip
                        icon={getEventTypeMeta(event.type).icon}
                        label={getEventTypeMeta(event.type).label}
                        size="small"
                        color={getEventTypeMeta(event.type).color}
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
                      />
                    </Box>
                    <EnhancedEventCard event={event} />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Container>
  );
} 