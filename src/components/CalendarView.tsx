'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CalendarToday,
  ChevronLeft,
  ChevronRight,
  Event,
  Hearing,
  HowToVote,
  Description,
  Schedule,
  LocationOn,
  Group,
  Refresh,
  Today
} from '@mui/icons-material';
import { CalendarEvent } from '../lib/calendar-events';

interface CalendarViewProps {
  view?: 'month' | 'week' | 'day';
  onEventClick?: (event: CalendarEvent) => void;
}

export default function CalendarView({
  view = 'month',
  onEventClick
}: CalendarViewProps) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch calendar data
  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/calendar?view=${view}&year=${year}&month=${month}&stats=true`);
      const data = await response.json();
      
      if (data.success) {
        setCalendarData(data);
      } else {
        setError(data.error || 'Failed to fetch calendar data');
      }
    } catch (err) {
      setError('Network error while fetching calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
    if (onEventClick) {
      onEventClick(event);
    }
  };

  // Get event type icon
  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'hearing': return <Hearing />;
      case 'vote': return <HowToVote />;
      case 'markup': return <Description />;
      case 'introduction': return <Event />;
      default: return <Event />;
    }
  };

  // Get event type color
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return theme.palette.primary.main;
      case 'vote': return theme.palette.error.main;
      case 'markup': return theme.palette.warning.main;
      case 'introduction': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  // Get chamber color
  const getChamberColor = (chamber: string) => {
    switch (chamber) {
      case 'house': return theme.palette.primary.main;
      case 'senate': return theme.palette.secondary.main;
      case 'both': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Fetch data when date changes
  useEffect(() => {
    fetchCalendarData();
  }, [year, month, view]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(fetchCalendarData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card sx={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <IconButton size="small" onClick={fetchCalendarData}>
              <Refresh />
            </IconButton>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">
              <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
              Congressional Calendar
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Today">
                <IconButton onClick={goToToday}>
                  <Today />
                </IconButton>
              </Tooltip>
              <Tooltip title="Previous Month">
                <IconButton onClick={goToPreviousMonth}>
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Typography>
              <Tooltip title="Next Month">
                <IconButton onClick={goToNextMonth}>
                  <ChevronRight />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchCalendarData}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Calendar Grid */}
          {calendarData?.calendar && (
            <Box>
              {/* Day Headers */}
              <Grid container sx={{ mb: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Grid item xs key={day}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: theme.palette.text.secondary,
                        py: 1
                      }}
                    >
                      {day}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              {/* Calendar Days */}
              {calendarData.calendar.weeks.map((week: any, weekIndex: number) => (
                <Grid container key={weekIndex} sx={{ mb: 1 }}>
                  {week.days.map((day: any, dayIndex: number) => (
                    <Grid item xs key={dayIndex}>
                      <Box
                        sx={{
                          minHeight: 100,
                          border: 1,
                          borderColor: 'divider',
                          p: 1,
                          backgroundColor: day.isToday ? theme.palette.action.selected : 'transparent',
                          opacity: day.isPast ? 0.6 : 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover
                          }
                        }}
                      >
                        {/* Date Number */}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: day.isToday ? 'bold' : 'normal',
                            color: day.isToday ? theme.palette.primary.main : 'inherit',
                            mb: 1
                          }}
                        >
                          {new Date(day.date).getDate()}
                        </Typography>

                        {/* Events */}
                        {day.events.slice(0, 3).map((event: CalendarEvent, eventIndex: number) => (
                          <Tooltip
                            key={eventIndex}
                            title={`${event.title} - ${formatTime(event.time)}`}
                            placement="top"
                          >
                            <Chip
                              size="small"
                              label={event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title}
                              icon={getEventTypeIcon(event.type)}
                              sx={{
                                backgroundColor: getEventTypeColor(event.type),
                                color: 'white',
                                fontSize: '0.6rem',
                                height: 20,
                                mb: 0.5,
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                            />
                          </Tooltip>
                        ))}

                        {/* More events indicator */}
                        {day.events.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            +{day.events.length - 3} more
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ))}
            </Box>
          )}

          {/* Stats */}
          {calendarData?.stats && (
            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Total Events: {calendarData.stats.totalEvents} • 
                Upcoming: {calendarData.stats.upcomingEvents} • 
                Today: {calendarData.stats.todayEvents}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getEventTypeIcon(selectedEvent.type)}
                <Typography variant="h6">
                  {selectedEvent.title}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Event Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Schedule />
                      </ListItemIcon>
                      <ListItemText
                        primary="Date & Time"
                        secondary={`${formatDate(selectedEvent.date)} ${formatTime(selectedEvent.time)}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Event />
                      </ListItemIcon>
                      <ListItemText
                        primary="Type"
                        secondary={
                          <Chip
                            size="small"
                            label={selectedEvent.type}
                            sx={{
                              backgroundColor: getEventTypeColor(selectedEvent.type),
                              color: 'white'
                            }}
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Group />
                      </ListItemIcon>
                      <ListItemText
                        primary="Chamber"
                        secondary={
                          <Chip
                            size="small"
                            label={selectedEvent.chamber}
                            sx={{
                              backgroundColor: getChamberColor(selectedEvent.chamber),
                              color: 'white'
                            }}
                          />
                        }
                      />
                    </ListItem>
                    {selectedEvent.committee && (
                      <ListItem>
                        <ListItemIcon>
                          <Group />
                        </ListItemIcon>
                        <ListItemText
                          primary="Committee"
                          secondary={selectedEvent.committee}
                        />
                      </ListItem>
                    )}
                    {selectedEvent.location && (
                      <ListItem>
                        <ListItemIcon>
                          <LocationOn />
                        </ListItemIcon>
                        <ListItemText
                          primary="Location"
                          secondary={selectedEvent.location}
                        />
                      </ListItem>
                    )}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedEvent.description || 'No description available.'}
                  </Typography>
                  
                  {selectedEvent.bills && selectedEvent.bills.length > 0 && (
                    <>
                      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        Related Bills
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedEvent.bills.map((bill, index) => (
                          <Chip
                            key={index}
                            size="small"
                            label={bill}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              {selectedEvent.url && (
                <Button
                  variant="contained"
                  onClick={() => window.open(selectedEvent.url, '_blank')}
                >
                  View Details
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
} 