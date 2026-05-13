'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Avatar,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close,
  Schedule,
  Person,
  Description,
  ArrowForward,
  OpenInNew,
  ContentCopy,
  AccountBalance,
  Star,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';

interface EventPreviewModalProps {
  open: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    type: string;
    committee?: string;
    date?: string;
    summary?: string;
    speakers?: string[];
    topics?: string[];
    metadata?: Record<string, unknown>;
    priority?: number;
  } | null;
}

export default function EventPreviewModal({ open, onClose, event }: EventPreviewModalProps) {
  const router = useRouter();
  const theme = useTheme();

  if (!event) return null;

  const handleViewFullDetails = () => {
    router.push(`/events/${event.id}`);
    onClose();
  };

  const handleOpenInNewTab = () => {
    window.open(`/events/${event.id}`, '_blank');
    onClose();
  };

  const handleCopyLink = () => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    navigator.clipboard.writeText(eventUrl);
    // Could add a toast notification here
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    // Handle empty strings
    if (dateString.trim() === '') return 'N/A';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.log('[EventPreviewModal] Invalid date:', dateString);
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '80vh',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: '1.5rem' }}>{getTypeIcon(event.type)}</span>
            <Typography variant="h6" component="div">
              Event Preview
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Chips Row */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {event.type && event.type.toLowerCase() === 'floor' && (
            <Chip icon={<AccountBalance fontSize="small" />} label="Floor" color="secondary" size="small" />
          )}
          {event.priority && event.priority >= 6 && (
            <Chip icon={<Star fontSize="small" />} label="High Priority" color="warning" size="small" />
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {event.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip
              label={event.type.toUpperCase()}
              color={getTypeColor(event.type)}
              size="small"
              variant="outlined"
            />
            {event.committee && (
              <Chip
                label={event.committee}
                size="small"
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  color: theme.palette.text.primary,
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 24,
                  borderRadius: 2
                }}
              />
            )}
          </Box>

          {event.date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {formatDate(event.date)}
              </Typography>
            </Box>
          )}
        </Box>

        {event.summary && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Description sx={{ fontSize: 16 }} />
              Summary
            </Typography>
            <Typography variant="body2" sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1,
              fontStyle: 'italic'
            }}>
              &ldquo;{event.summary}&rdquo;
            </Typography>
          </Box>
        )}

        {event.speakers && event.speakers.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ fontSize: 16 }} />
              Speakers ({event.speakers.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {event.speakers.slice(0, 5).map((speaker, index) => (
                <Chip
                  key={index}
                  label={speaker}
                  size="small"
                  variant="outlined"
                  avatar={<Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }} aria-hidden>
                    {speaker.split(' ').map(n => n[0]).join('')}
                  </Avatar>}
                />
              ))}
              {event.speakers.length > 5 && (
                <Chip
                  label={`+${event.speakers.length - 5} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        {event.topics && event.topics.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Key Topics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {event.topics.slice(0, 6).map((topic, index) => (
                <Chip
                  key={index}
                  label={topic}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
              {event.topics.length > 6 && (
                <Chip
                  label={`+${event.topics.length - 6} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Event ID: {event.id}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={handleCopyLink}
              size="small"
              title="Copy link"
            >
              <ContentCopy sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              onClick={handleOpenInNewTab}
              size="small"
              title="Open in new tab"
            >
              <OpenInNew sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* View Details Button */}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" size="small" endIcon={<ArrowForward />} onClick={handleViewFullDetails}>
            View Details
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 