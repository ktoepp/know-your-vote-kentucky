'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Breadcrumbs, 
  Link, 
  Button, 
  Paper, 
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Divider,
  Badge
} from '@mui/material';
import { 
  Upload, 
  Add, 
  FilterList, 
  Sort, 
  Visibility,
  TrendingUp,
  TrendingDown,
  Remove,
  Person,
  Description,
  Gavel,
  LocationOn,
  AccessTime,
  PriorityHigh,
  Star,
  StarBorder
} from '@mui/icons-material';
import TableView from '../components/TableView';
import StatusBar from '../components/StatusBar';
import { useBillsData, Bill } from '../lib/useBillsData';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';

interface EnhancedEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: number;
  location?: string;
  eventType?: string;
  chamber?: string;
  committee?: string;
  summary?: string;
  detailedSummary?: string;
  speakers?: Array<{
    name: string;
    role: string;
    party?: string;
    state?: string;
    affiliation?: string;
  }>;
  relatedBills?: Array<{
    number: string;
    title: string;
    status: string;
    sponsor: string;
  }>;
  keyTopics?: string[];
  priority?: 'high' | 'medium' | 'low';
  importance?: 'high' | 'medium' | 'low';
  controversy?: 'high' | 'medium' | 'low';
  outcome?: string;
  publicEngagement?: {
    viewers?: number;
    socialMentions?: number;
    trending?: boolean;
  };
  tags?: string[];
  preview_tags?: string[];
  status?: 'upcoming' | 'live' | 'completed';
}

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

export default function TablePage() {
  const [events, setEvents] = useState<EnhancedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EnhancedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading events...');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Filter states
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [chamberFilter, setChamberFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const theme = useTheme();

  // Fetch event data from the same API as graph explorer
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setStatus('Fetching events...');
      
      const response = await fetch('/api/graph-data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.nodes) {
        // Filter to only Event nodes and transform to enhanced format
        const eventNodes = data.data.nodes.filter((node: Record<string, unknown>) => node && node.type === 'Event');
        
        // Transform nodes to EnhancedEvent interface
        const transformedEvents: EnhancedEvent[] = eventNodes
          .map((node: Record<string, unknown>) => ({
            id: String(node.id || ''),
            title: String(node.title || node.name || 'Untitled Event'),
            date: String(node.date || ''),
            time: String(node.time || ''),
            duration: typeof node.duration === 'number' ? node.duration : undefined,
            location: String(node.location || ''),
            eventType: String(node.eventType || ''),
            chamber: String(node.chamber || ''),
            committee: String(node.committee || ''),
            summary: String(node.summary || ''),
            detailedSummary: String(node.detailedSummary || ''),
            speakers: Array.isArray(node.speakers) ? node.speakers as any[] : [],
            relatedBills: Array.isArray(node.relatedBills) ? node.relatedBills as any[] : [],
            keyTopics: Array.isArray(node.keyTopics) ? node.keyTopics as string[] : [],
            priority: String(node.priority || 'medium') as 'high' | 'medium' | 'low',
            importance: String(node.importance || 'medium') as 'high' | 'medium' | 'low',
            controversy: String(node.controversy || 'medium') as 'high' | 'medium' | 'low',
            outcome: String(node.outcome || ''),
            publicEngagement: node.publicEngagement as any || {},
            tags: Array.isArray(node.tags) ? node.tags as string[] : [],
            preview_tags: Array.isArray(node.preview_tags) ? node.preview_tags as string[] : [],
            status: String(node.status || 'completed') as 'upcoming' | 'live' | 'completed'
          }))
          .filter((event: EnhancedEvent) => {
            // Filter out low-quality events
            const hasGoodTitle = event.title && 
              !event.title.includes('Congressional Content -') && 
              !event.title.includes('Untitled Event');
            const hasGoodSummary = event.summary && 
              !event.summary.includes('No summary available') && 
              !event.summary.includes('i apologize') &&
              event.summary.length > 10;
            const hasDate = event.date && event.date !== '';
            
            return hasGoodTitle && hasGoodSummary && hasDate;
          })
          .map((event: EnhancedEvent) => ({
            ...event,
            // Clean up titles
            title: event.title.replace(/^Congressional Content - /, ''),
            // Format dates nicely
            date: event.date ? (() => {
              if (!event.date) return 'N/A';
              if (event.date.trim() === '') return 'N/A';
              const date = new Date(event.date);
              if (isNaN(date.getTime())) {
                console.log('[Table] Invalid date:', event.date);
                return 'N/A';
              }
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            })() : 'N/A',
          }));
        
        setEvents(transformedEvents);
        setFilteredEvents(transformedEvents);
        
        if (transformedEvents.length === 0) {
          setStatus('Database empty - add content to get started');
        } else {
          setStatus(`Loaded ${transformedEvents.length} quality events from migrated database`);
        }
        
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setStatus('Error loading events');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.keyTopics?.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase())) ||
        event.speakers?.some(speaker => speaker.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter);
    }

    // Apply chamber filter
    if (chamberFilter !== 'all') {
      filtered = filtered.filter(event => event.chamber === chamberFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(event => event.priority === priorityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority || 'medium'];
          bValue = priorityOrder[b.priority || 'medium'];
          break;
        case 'engagement':
          aValue = a.publicEngagement?.viewers || 0;
          bValue = b.publicEngagement?.viewers || 0;
          break;
        default:
          aValue = a.title;
          bValue = b.title;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEvents(filtered);
  }, [events, searchTerm, eventTypeFilter, chamberFilter, priorityFilter, sortBy, sortOrder]);

  // Handle "View in Graph" button click
  const handleViewInGraph = (eventId: string) => {
    window.location.href = `/explore?focus=${eventId}`;
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchEvents();
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <PriorityHigh color="error" />;
      case 'medium': return <Star color="warning" />;
      case 'low': return <StarBorder color="success" />;
      default: return <Star color="action" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getEngagementIcon = (engagement: any) => {
    if (!engagement?.viewers) return null;
    if (engagement.trending) return <TrendingUp color="success" />;
    if (engagement.viewers > 10000) return <TrendingUp color="primary" />;
    return <Remove color="action" />;
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Empty state component
  const EmptyState = () => (
    <Paper sx={{ p: 4, textAlign: 'center', my: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" color="text.secondary" gutterBottom>
          No events in database yet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upload a video or import content to get started with your congressional events database.
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => window.location.href = '/upload'}
          size="large"
        >
          Upload Content
        </Button>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => window.location.href = '/browse'}
          size="large"
        >
          Browse Content
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
        <Typography variant="body2">
          <strong>Getting Started:</strong> Use the &ldquo;Upload Content&rdquo; button to process your first congressional video. 
          The system will automatically extract events, speakers, and topics for your database.
        </Typography>
      </Alert>
    </Paper>
  );

  return (
    <>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link href="/" color="inherit">Home</Link>
          <Typography color="text.primary">Event Database</Typography>
        </Breadcrumbs>
        
        <StatusBar 
          loading={loading}
          status={status}
          updatedAgo={lastUpdated ? 'just now' : undefined}
          newContent={false}
          onRefresh={handleRefresh}
        />
        
        {/* Data Source Indicator */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Data Source:</strong> This shows events from your migrated database. 
            For live congressional data, use the <Link href="/live-content" color="inherit">Live Content</Link> page 
            to discover and import new congressional proceedings.
          </Typography>
        </Alert>

        {/* Filters and Search */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  label="Event Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="hearing">Hearing</MenuItem>
                  <MenuItem value="session">Session</MenuItem>
                  <MenuItem value="markup">Markup</MenuItem>
                  <MenuItem value="vote">Vote</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Chamber</InputLabel>
                <Select
                  value={chamberFilter}
                  onChange={(e) => setChamberFilter(e.target.value)}
                  label="Chamber"
                >
                  <MenuItem value="all">All Chambers</MenuItem>
                  <MenuItem value="house">House</MenuItem>
                  <MenuItem value="senate">Senate</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="title">Title</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="engagement">Engagement</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Enhanced Event Table */}
        {!loading && !error && filteredEvents.length > 0 && (
          <Paper sx={{ overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell><strong>Event</strong></TableCell>
                    <TableCell><strong>Date & Time</strong></TableCell>
                    <TableCell><strong>Type & Chamber</strong></TableCell>
                    <TableCell><strong>Speakers</strong></TableCell>
                    <TableCell><strong>Bills</strong></TableCell>
                    <TableCell><strong>Priority</strong></TableCell>
                    <TableCell><strong>Engagement</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="600">
                            {event.title}
                          </Typography>
                          {event.committee && (
                            <Typography variant="caption" color="text.secondary">
                              {event.committee}
                            </Typography>
                          )}
                          {event.summary && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {event.summary}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {event.date}
                          </Typography>
                          {event.time && (
                            <Typography variant="caption" color="text.secondary">
                              {event.time}
                            </Typography>
                          )}
                          {event.duration && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {Math.floor(event.duration / 60)}m {event.duration % 60}s
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip 
                            label={event.eventType || 'Unknown'} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                          {event.chamber && (
                            <Chip 
                              label={event.chamber} 
                              size="small" 
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {event.speakers?.slice(0, 2).map((speaker, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              {speaker.name} ({speaker.role})
                            </Typography>
                          ))}
                          {event.speakers && event.speakers.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{event.speakers.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {event.relatedBills?.slice(0, 2).map((bill, idx) => (
                            <Typography 
                              key={idx} 
                              variant="caption" 
                              display="block"
                              sx={{
                                color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                '&:hover': {
                                  color: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
                                }
                              }}
                            >
                              {formatBillNumber(bill)}
                            </Typography>
                          ))}
                          {event.relatedBills && event.relatedBills.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{event.relatedBills.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getPriorityIcon(event.priority || 'medium')}
                          <Chip 
                            label={event.priority || 'medium'} 
                            size="small" 
                            color={getPriorityColor(event.priority || 'medium')}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getEngagementIcon(event.publicEngagement)}
                          {event.publicEngagement?.viewers && (
                            <Typography variant="caption">
                              {event.publicEngagement.viewers.toLocaleString()} viewers
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              onClick={() => window.location.href = `/events/${event.id}`}
                            >
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View in Graph">
                            <IconButton 
                              size="small"
                              onClick={() => handleViewInGraph(event.id)}
                            >
                              <Description />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Empty State */}
        {!loading && !error && filteredEvents.length === 0 && <EmptyState />}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <Typography variant="body1">Error: {error}</Typography>
          </Alert>
        )}
      </Container>
    </>
  );
} 