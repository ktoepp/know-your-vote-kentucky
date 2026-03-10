"use client";
import React from 'react';
import { Box, Typography, Chip, Tooltip, IconButton, Card, CardContent } from '@mui/material';
import { ExpandMore, ExpandLess, Event, Link, TrendingUp, Person, Business, Schedule } from '@mui/icons-material';
import { EventBillLink } from '../lib/useEventBillLinks';

interface LinkedEventsDisplayProps {
  links: EventBillLink[];
  events: any[]; // Array of event objects
  onEventClick?: (eventId: string) => void;
  maxDisplay?: number;
}

const getRelationshipIcon = (type: EventBillLink['relationshipType']) => {
  switch (type) {
    case 'mentioned':
      return <Event fontSize="small" />;
    case 'action':
      return <Link fontSize="small" />;
    case 'topic':
      return <TrendingUp fontSize="small" />;
    case 'sponsor':
      return <Person fontSize="small" />;
    case 'committee':
      return <Business fontSize="small" />;
    default:
      return <Event fontSize="small" />;
  }
};

const getRelationshipColor = (type: EventBillLink['relationshipType']) => {
  switch (type) {
    case 'mentioned':
      return 'primary';
    case 'action':
      return 'success';
    case 'topic':
      return 'warning';
    case 'sponsor':
      return 'info';
    case 'committee':
      return 'secondary';
    default:
      return 'default';
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return 'success';
  if (confidence >= 60) return 'warning';
  return 'error';
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function LinkedEventsDisplay({ 
  links, 
  events,
  onEventClick, 
  maxDisplay = 3 
}: LinkedEventsDisplayProps) {
  const [expanded, setExpanded] = React.useState(false);
  
  if (!links || links.length === 0) {
    return null;
  }

  // Sort by confidence and relationship type priority
  const sortedLinks = [...links].sort((a, b) => {
    // Priority: action > mentioned > sponsor > committee > topic
    const typePriority = {
      action: 5,
      mentioned: 4,
      sponsor: 3,
      committee: 2,
      topic: 1
    };
    
    const aPriority = typePriority[a.relationshipType];
    const bPriority = typePriority[b.relationshipType];
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.confidence - a.confidence;
  });

  const displayLinks = expanded ? sortedLinks : sortedLinks.slice(0, maxDisplay);
  const hasMore = links.length > maxDisplay;

  // Create a map of event IDs to event objects for quick lookup
  const eventMap = new Map(events.map(event => [event.id, event]));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="caption" sx={{ 
        color: 'text.disabled', 
        fontWeight: 400, 
        mb: 1, 
        display: 'block',
        fontSize: '0.65rem',
        opacity: 0.6
      }}>
        LINKED EVENTS ({links.length}):
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {displayLinks.map((link, index) => {
          const event = eventMap.get(link.eventId);
          if (!event) return null;

          return (
            <Card 
              key={`${link.eventId}-${link.billNumber}-${index}`}
              sx={{ 
                p: 1.5, 
                cursor: onEventClick ? 'pointer' : 'default',
                '&:hover': onEventClick ? { 
                  backgroundColor: 'action.hover',
                  transform: 'translateY(-1px)'
                } : {},
                transition: 'all 0.2s ease-in-out',
                border: '1px solid',
                borderColor: 'divider'
              }}
              onClick={() => onEventClick?.(link.eventId)}
            >
              <CardContent sx={{ p: '0 !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={getRelationshipIcon(link.relationshipType)}
                      label={link.relationshipType}
                      size="small"
                      color={getRelationshipColor(link.relationshipType)}
                      variant="outlined"
                    />
                    <Chip
                      label={`${link.confidence}%`}
                      size="small"
                      color={getConfidenceColor(link.confidence)}
                      variant="outlined"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Schedule sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(event.date)}
                    </Typography>
                  </Box>
                </Box>
                
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {event.title || 'Untitled Event'}
                </Typography>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {event.type} • {event.chamber}
                </Typography>
                
                {/* Evidence summary */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {link.evidence.slice(0, 2).map((evidence, i) => (
                    <Tooltip key={i} title={evidence}>
                      <Chip
                        label={evidence.length > 20 ? `${evidence.substring(0, 20)}...` : evidence}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Tooltip>
                  ))}
                  {link.evidence.length > 2 && (
                    <Chip
                      label={`+${link.evidence.length - 2} more`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
      
      {hasMore && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ p: 0.5 }}
          >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {expanded ? 'Show less' : `Show ${links.length - maxDisplay} more`}
          </Typography>
        </Box>
      )}
    </Box>
  );
} 