'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Avatar,
  Button,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Pause from '@mui/icons-material/Pause';
import VolumeUp from '@mui/icons-material/VolumeUp';
import VolumeOff from '@mui/icons-material/VolumeOff';
import Fullscreen from '@mui/icons-material/Fullscreen';
import Share from '@mui/icons-material/Share';
import Bookmark from '@mui/icons-material/Bookmark';
import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import Print from '@mui/icons-material/Print';
import ContentCopy from '@mui/icons-material/ContentCopy';
import OpenInNew from '@mui/icons-material/OpenInNew';
import Schedule from '@mui/icons-material/Schedule';
import Person from '@mui/icons-material/Person';
import Business from '@mui/icons-material/Business';
import Description from '@mui/icons-material/Description';
import Gavel from '@mui/icons-material/Gavel';
import TrendingUp from '@mui/icons-material/TrendingUp';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Refresh from '@mui/icons-material/Refresh';
import Warning from '@mui/icons-material/Warning';
import Search from '@mui/icons-material/Search';
import AccountTree from '@mui/icons-material/AccountTree';
import Topic from '@mui/icons-material/Topic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import BackNavigation from '@/app/components/BackNavigation';
import NavigationLoader from '@/app/components/NavigationLoader';
import InteractiveTermTooltip from '@/app/components/InteractiveTermTooltip';
import { trackEventNavigation, trackUserFlow } from '@/lib/analytics';

import Timeline, { TimelineStage } from '../../components/Timeline';
import { useBillsData, Bill } from '../../lib/useBillsData';

interface EventDetail {
  id: string;
  title: string;
  type: string;
  date: string;
  duration?: number | string;
  committee?: string;
  chamber?: string;
  summary?: string;
  detailedSummary?: string;
  transcript?: string;
  speakers?: Array<{
    name: string;
    role?: string;
    party?: string;
    state?: string;
    avatar?: string;
    affiliation?: string;
    bio?: string;
  }>;
  topics?: string[];
  keyTopics?: string[];
  bills?: Array<{
    number: string;
    title: string;
    status: string;
    sponsor?: string;
  }>;
  relatedBills?: Array<{
    number: string;
    title: string;
    status: string;
    sponsor?: string;
  }>;
  metadata?: Record<string, unknown>;
  relatedEvents?: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
    relevance: number;
  }>;
  mediaCoverage?: {
    ket?: string;
    youtube?: string;
    senate?: string;
    committee?: string;
    transcript?: string;
  };
  publicEngagement?: {
    viewers?: number;
    socialMentions?: number;
    trending?: boolean;
  };
  expectedOutcomes?: string[];
  historicalContext?: string;
  tags?: string[];
  priority?: string | number;
}

// Fallback: define staticEvents as an empty array if not imported
const staticEvents: EventDetail[] = [];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params?.id ? String(params.id) : '';
  const theme = useTheme();
  
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const router = useRouter();

  // Track page view
  useEffect(() => {
    if (eventId) {
      trackEventNavigation({
        event_id: eventId,
        source: ((): 'search' | 'graph' | 'discovery' | 'related' | 'table' | 'homepage' => {
          const allowed = ['search', 'graph', 'discovery', 'related', 'table', 'homepage'] as const;
          const from = searchParams?.get('from');
          return (from && allowed.includes(from as any)) ? (from as 'search' | 'graph' | 'discovery' | 'related' | 'table' | 'homepage') : 'search';
        })(),
        context: {
          query: searchParams?.get('query') || '',
          filters: {
            speaker: searchParams?.get('speaker') || '',
            topic: searchParams?.get('topic') || '',
            bill: searchParams?.get('bill') || '',
          }
        }
      });

      trackUserFlow({
        action: 'page_view',
        page: 'event_detail',
        component: 'event_page',
        data: { eventId }
      });
    }
  }, [eventId, searchParams]);

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First try to find in static database
        const staticEvent = staticEvents.find(e => e.id === eventId);
        
        if (staticEvent) {
          setEvent(staticEvent);
          setLoading(false);
          return;
        }
        
        // If not found in static data, try live data
        const response = await fetch(`/api/discover-content?query=${encodeURIComponent(eventId)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
          const liveEvent = result.data[0];
          setEvent(liveEvent);
        } else {
          setError('Event not found');
        }
        
      } catch (err: any) {
        setError(err.message || 'Failed to load event data');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    trackUserFlow({
      action: 'interaction',
      page: 'event_detail',
      component: 'bookmark_button',
      data: { eventId, bookmarked: !isBookmarked }
    });
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url);
    setShowShareDialog(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Handle empty strings
    if (dateString.trim() === '') return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('[EventDetail] Invalid date:', dateString);
      return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hearing': return 'primary';
      case 'floor': return 'secondary';
      case 'markup': return 'info';
      case 'event': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hearing': return '🎤';
      case 'floor': return '🏛️';
      case 'markup': return '📝';
      case 'event': return '📅';
      default: return '📄';
    }
  };

  // Navigation functions for interactive elements
  const navigateToSearch = (query: string, type: 'tag' | 'topic' | 'speaker' | 'bill') => {
    const searchUrl = `/search?q=${encodeURIComponent(query)}`;
    router.push(searchUrl);
    trackUserFlow({
      action: 'navigation',
      page: 'event_detail',
      component: `${type}_tag`,
      data: { query, type, eventId }
    });
  };

  const navigateToGraph = (filterType: string, filterValue: string) => {
    router.push(`/search?q=${encodeURIComponent(filterValue)}`);
    trackUserFlow({
      action: 'navigation',
      page: 'event_detail',
      component: 'graph_link',
      data: { filterType, filterValue, eventId, destination: 'search' }
    });
  };

  const navigateToTable = (filterType: string, filterValue: string) => {
    router.push(`/search?q=${encodeURIComponent(filterValue)}`);
    trackUserFlow({
      action: 'navigation',
      page: 'event_detail',
      component: 'table_link',
      data: { filterType, filterValue, eventId, destination: 'search' }
    });
  };

  // Enhanced tag component with navigation
  const InteractiveTag = ({ tag, type = 'tag' }: { tag: string; type?: 'tag' | 'topic' | 'speaker' | 'bill' }) => {
    const isPoliticalTerm = [
      'filibuster', 'cloture', 'omnibus', 'reconciliation', 'earmark', 
      'deficit', 'debt ceiling', 'entitlement', 'discretionary spending'
    ].includes(tag.toLowerCase());

    if (isPoliticalTerm) {
      return (
        <InteractiveTermTooltip term={tag.toLowerCase()}>
          <Chip 
            label={tag} 
            size="small" 
            variant="outlined" 
            color="primary"
            onClick={() => navigateToSearch(tag, type)}
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.50' } }}
          />
        </InteractiveTermTooltip>
      );
    }

    return (
      <Chip 
        label={tag} 
        size="small" 
        variant="outlined" 
        color="default"
        onClick={() => navigateToSearch(tag, type)}
        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
      />
    );
  };

  // Enhanced speaker component with navigation
  const InteractiveSpeaker = ({ speaker }: { speaker: any }) => (
    <ListItem alignItems="flex-start">
      <Avatar sx={{ mr: 2 }}>{speaker.name[0]}</Avatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography 
              fontWeight={600} 
              sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
              onClick={() => navigateToSearch(speaker.name, 'speaker')}
            >
              {speaker.name}
            </Typography>
            {speaker.role && (
              <Tooltip title="Search for this role">
                <Chip 
                  label={speaker.role} 
                  size="small" 
                  onClick={() => navigateToSearch(speaker.role, 'topic')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
            {speaker.party && (
              <Tooltip title="View all events with this party">
                <Chip 
                  label={speaker.party} 
                  size="small" 
                  color="secondary"
                  onClick={() => navigateToTable('party', speaker.party)}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
            {speaker.affiliation && (
              <Tooltip title="View committee events">
                <Chip 
                  label={speaker.affiliation} 
                  size="small" 
                  color="info"
                  onClick={() => navigateToSearch(speaker.affiliation, 'topic')}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
          </Box>
        }
        secondary={speaker.bio && <Typography component="span" variant="body2" color="text.secondary">{speaker.bio}</Typography>}
      />
    </ListItem>
  );

  // Enhanced bill component with navigation
  const InteractiveBill = ({ bill }: { bill: any }) => (
    <ListItem>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{ 
                cursor: 'pointer', 
                color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                '&:hover': { 
                  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark 
                } 
              }}
              onClick={() => navigateToSearch(bill.number, 'bill')}
            >
              {bill.number}: {bill.title}
            </Typography>
          </Box>
        }
        secondary={
          <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {bill.sponsor && (
              <Tooltip title="Search for this sponsor">
                <span>
                  <Chip 
                    label={`Sponsor: ${bill.sponsor}`} 
                    size="small"
                    onClick={() => navigateToSearch(bill.sponsor, 'speaker')}
                    sx={{ cursor: 'pointer', marginLeft: 4 }}
                  />
                </span>
              </Tooltip>
            )}
          </span>
        }
      />
    </ListItem>
  );

  if (loading) {
    return <NavigationLoader open={true} />;
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Warning color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" color="error" gutterBottom>
            Event Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" color="primary" href="/events" sx={{ mt: 3 }}>
            Back to Events
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Back Navigation */}
        <BackNavigation 
          eventTitle={event.title}
          committee={event.committee || ''}
        />

        {/* Event Header */}
        <Paper sx={{ p: 4, mb: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ flexGrow: 1 }}>
              {/* Header with Status and Type */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <Chip
                  label={event.type.toUpperCase()}
                  color={getTypeColor(event.type) as any}
                  variant="outlined"
                  sx={{ 
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 24
                  }}
                />
                {event.committee && (
                  <Tooltip title="View all events from this committee">
                    <Chip
                      label={event.committee}
                      onClick={() => navigateToTable('committee', event.committee!)}
                      sx={{ 
                        backgroundColor: theme.palette.action.hover,
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                        fontSize: '0.7rem',
                        height: 24,
                        borderRadius: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: theme.palette.action.selected,
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    />
                  </Tooltip>
                )}
                {event.chamber && (
                  <Tooltip title="View all events from this chamber">
                    <Chip
                      label={event.chamber}
                      variant="outlined"
                      color="secondary"
                      onClick={() => navigateToTable('chamber', event.chamber!)}
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { bgcolor: 'secondary.50' },
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        height: 24
                      }}
                    />
                  </Tooltip>
                )}
                {event.priority && (
                  <Chip
                    label={String(event.priority).toUpperCase() + ' PRIORITY'}
                    color="error"
                    variant="filled"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 24
                    }}
                  />
                )}
              </Box>
              
              {/* Title and Date */}
              <Typography variant="h4" fontWeight={800} gutterBottom sx={{ 
                lineHeight: 1.3,
                mb: 1.5
              }}>
                {event.title}
              </Typography>
              
              {event.date && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Schedule sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {formatDate(event.date)}
                  </Typography>
                </Box>
              )}
              
              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {event.tags.map((tag, i) => (
                    <InteractiveTag key={i} tag={tag} />
                  ))}
                </Box>
              )}
            </Box>
            <Box>
              <IconButton onClick={handleBookmark} color={isBookmarked ? 'primary' : 'default'}>
                {isBookmarked ? <Bookmark /> : <BookmarkBorder />}
              </IconButton>
              <IconButton onClick={handleShare}>
                <Share />
              </IconButton>
            </Box>
          </Box>

          {/* Detailed Summary & Context */}
          {event.detailedSummary && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Detailed Summary & Context</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
                  {event.detailedSummary.split(/(filibuster|cloture|omnibus|reconciliation|earmark|deficit|debt ceiling|entitlement|discretionary spending)/gi).map((part, idx) => {
                    const term = part.toLowerCase();
                    if ([
                      'filibuster', 'cloture', 'omnibus', 'reconciliation', 'earmark', 'deficit', 'debt ceiling', 'entitlement', 'discretionary spending',
                    ].includes(term)) {
                      return (
                        <InteractiveTermTooltip key={idx} term={term}>
                          <span className="relative inline-block cursor-help text-primary-700 font-semibold underline decoration-dotted underline-offset-2">
                            {part}
                          </span>
                        </InteractiveTermTooltip>
                      );
                    }
                    return <span key={idx}>{part}</span>;
                  })}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Navigation Actions */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Tooltip title="View related events in graph view">
              <Button
                variant="outlined"
                startIcon={<AccountTree />}
                onClick={() => navigateToGraph('event', event.id)}
                size="small"
              >
                View in Graph
              </Button>
            </Tooltip>
            <Tooltip title="Search for similar events">
              <Button
                variant="outlined"
                startIcon={<Search />}
                onClick={() => navigateToSearch(event.title, 'topic')}
                size="small"
              >
                Find Similar
              </Button>
            </Tooltip>
            <Tooltip title="View all events from this committee">
              <span>
                {event.committee && (
                  <Button
                    variant="outlined"
                    startIcon={<Business />}
                    onClick={() => navigateToTable('committee', event.committee!)}
                    size="small"
                  >
                    Committee Events
                  </Button>
                )}
              </span>
            </Tooltip>
            <Tooltip title="View all events with these topics">
              <span>
                {event.keyTopics && event.keyTopics.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<Topic />}
                    onClick={() => navigateToSearch(event.keyTopics![0], 'topic')}
                    size="small"
                  >
                    Topic Events
                  </Button>
                )}
              </span>
            </Tooltip>
          </Box>

          {/* Key Topics & Tags */}
          {event.keyTopics && event.keyTopics.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Key Topics</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {event.keyTopics!.map((topic, i) => (
                  <InteractiveTag key={i} tag={topic} type="topic" />
                ))}
              </Box>
            </Box>
          )}

          {/* Speaker Details */}
          {(event.speakers && event.speakers.length > 0) && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Participants & Speakers</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {event.speakers.map((speaker, i) => (
                    <InteractiveSpeaker key={i} speaker={speaker} />
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Related Bills/Legislation */}
          {(event.relatedBills && event.relatedBills.length > 0) && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Related Legislation</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {event.relatedBills.map((bill, i) => (
                    <InteractiveBill key={i} bill={bill} />
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Media Coverage */}
          {event.mediaCoverage && Object.keys(event.mediaCoverage).length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Media Coverage & Resources</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {event.mediaCoverage.ket && <Button href={event.mediaCoverage.ket} target="_blank" rel="noopener" startIcon={<OpenInNew />}>KET Video</Button>}
                  {event.mediaCoverage.youtube && <Button href={event.mediaCoverage.youtube} target="_blank" rel="noopener" startIcon={<OpenInNew />}>YouTube Stream</Button>}
                  {event.mediaCoverage.senate && <Button href={event.mediaCoverage.senate} target="_blank" rel="noopener" startIcon={<OpenInNew />}>Senate Floor</Button>}
                  {event.mediaCoverage.committee && <Button href={event.mediaCoverage.committee} target="_blank" rel="noopener" startIcon={<OpenInNew />}>Committee Page</Button>}
                  {event.mediaCoverage.transcript && <Button href={event.mediaCoverage.transcript} target="_blank" rel="noopener" startIcon={<OpenInNew />}>Official Transcript</Button>}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Public Engagement */}
          {event.publicEngagement && (
            <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Public Engagement</Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                {event.publicEngagement.viewers !== undefined && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" fontWeight={700}>{event.publicEngagement.viewers.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">Viewers</Typography>
                  </Box>
                )}
                {event.publicEngagement.socialMentions !== undefined && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" fontWeight={700}>{event.publicEngagement.socialMentions.toLocaleString()}</Typography>
                    <Typography variant="caption" color="text.secondary">Social Mentions</Typography>
                  </Box>
                )}
                {event.publicEngagement.trending && (
                  <Box sx={{ textAlign: 'center' }}>
                    <TrendingUp color="success" />
                    <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>Trending</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}

          {/* Expected Outcomes */}
          {event.expectedOutcomes && event.expectedOutcomes.length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Expected Outcomes</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {event.expectedOutcomes.map((outcome, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={outcome} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Historical Context */}
          {event.historicalContext && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight={700}>Historical Context</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">{event.historicalContext}</Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>

        {/* Main Content Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="event detail tabs">
            <Tab label="Transcript" icon={<Description />} iconPosition="start" />
            <Tab label="Speakers" icon={<Person />} iconPosition="start" />
            <Tab label="Related Bills" icon={<Gavel />} iconPosition="start" />
            <Tab label="Related Events" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="Metadata" icon={<Business />} iconPosition="start" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {/* Transcript Tab */}
            {event.transcript ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={audioPlaying ? <Pause /> : <PlayArrow />}
                    onClick={() => setAudioPlaying(!audioPlaying)}
                  >
                    {audioPlaying ? 'Pause' : 'Play'} Audio
                  </Button>
                  <IconButton onClick={() => setAudioMuted(!audioMuted)}>
                    {audioMuted ? <VolumeOff /> : <VolumeUp />}
                  </IconButton>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(e.target.value as number)}
                    >
                      <MenuItem value={0.5}>0.5x</MenuItem>
                      <MenuItem value={0.75}>0.75x</MenuItem>
                      <MenuItem value={1}>1x</MenuItem>
                      <MenuItem value={1.25}>1.25x</MenuItem>
                      <MenuItem value={1.5}>1.5x</MenuItem>
                      <MenuItem value={2}>2x</MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton>
                    <Fullscreen />
                  </IconButton>
                </Box>

                <Paper sx={{ p: 3, maxHeight: 600, overflow: 'auto' }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {event.transcript}
                  </Typography>
                </Paper>
              </Box>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No transcript available for this event.
                </Typography>
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Speakers Tab */}
            {event.speakers && event.speakers.length > 0 ? (
              <Grid container spacing={2}>
                {event.speakers.map((speaker, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 56, height: 56 }}>
                            {speaker.avatar ? (
                              <img src={speaker.avatar} alt={speaker.name} />
                            ) : (
                              speaker.name.split(' ').map(n => n[0]).join('')
                            )}
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{speaker.name}</Typography>
                            {speaker.role && (
                              <Typography variant="body2" color="text.secondary">
                                {speaker.role}
                              </Typography>
                            )}
                            {speaker.party && (
                              <Typography variant="caption" color="primary">
                                {speaker.party} - {speaker.state}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button size="small">View Profile</Button>
                        <Button size="small">View Other Events</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No speaker information available for this event.
                </Typography>
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Related Bills Tab */}
            {event.bills && event.bills.length > 0 ? (
              <List>
                {event.bills.map((bill, index) => (
                  <InteractiveBill key={index} bill={bill} />
                ))}
              </List>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No related bills available for this event.
                </Typography>
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* Related Events Tab */}
            {event.relatedEvents && event.relatedEvents.length > 0 ? (
              <Grid container spacing={2}>
                {event.relatedEvents.map((relatedEvent) => (
                  <Grid item xs={12} sm={6} md={4} key={relatedEvent.id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {relatedEvent.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {formatDate(relatedEvent.date)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={relatedEvent.type} size="small" />
                          <Typography variant="caption" color="text.secondary">
                            {relatedEvent.relevance}% relevant
                          </Typography>
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button size="small">View Event</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No related events available for this event.
                </Typography>
              </Alert>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            {/* Metadata Tab */}
            {event.metadata ? (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6">Event Metadata</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '1rem', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}>
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  No metadata available for this event.
                </Typography>
              </Alert>
            )}
          </TabPanel>
        </Paper>

        {/* Related Content Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Related Content
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                More from this Committee
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Recent Committee Hearings"
                    secondary="View all recent hearings from this committee"
                  />
                  <Button variant="outlined" size="small">
                    View All
                  </Button>
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Similar Topics
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Related Topic Events"
                    secondary="Find events discussing similar topics"
                  />
                  <Button variant="outlined" size="small">
                    Explore
                  </Button>
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)}>
        <DialogTitle>Share Event</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Share this event with others:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={handleCopyLink}
              fullWidth
            >
              Copy Link
            </Button>
            <Button
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={() => window.open(`/events/${eventId}`, '_blank')}
              fullWidth
            >
              Open in New Tab
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 