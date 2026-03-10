"use client";
import React from 'react';
import { Box, Typography, Chip, Tooltip, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, Receipt, Link, TrendingUp, Person, Business } from '@mui/icons-material';
import { EventBillLink } from '../lib/useEventBillLinks';

interface LinkedBillsDisplayProps {
  links: EventBillLink[];
  onBillClick?: (billNumber: string) => void;
  maxDisplay?: number;
}

const getRelationshipIcon = (type: EventBillLink['relationshipType']) => {
  switch (type) {
    case 'mentioned':
      return <Receipt fontSize="small" />;
    case 'action':
      return <Link fontSize="small" />;
    case 'topic':
      return <TrendingUp fontSize="small" />;
    case 'sponsor':
      return <Person fontSize="small" />;
    case 'committee':
      return <Business fontSize="small" />;
    default:
      return <Receipt fontSize="small" />;
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

export default function LinkedBillsDisplay({ 
  links, 
  onBillClick, 
  maxDisplay = 3 
}: LinkedBillsDisplayProps) {
  const [expanded, setExpanded] = React.useState(false);
  
  if (!links || links.length === 0) {
    return null;
  }

  // Sort by confidence and relationship type priority
  const sortedLinks = [...links].sort((a, b) => {
    // Priority: mentioned > action > sponsor > committee > topic
    const typePriority = {
      mentioned: 5,
      action: 4,
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
        LINKED BILLS ({links.length}):
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {displayLinks.map((link, index) => (
          <Tooltip
            key={`${link.eventId}-${link.billNumber}-${index}`}
            title={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {link.billNumber}
                </Typography>
                <Typography variant="caption">
                  Confidence: {link.confidence}%
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  Evidence:
                </Typography>
                {link.evidence.map((evidence, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                    • {evidence}
                  </Typography>
                ))}
              </Box>
            }
            arrow
          >
            <Chip
              icon={getRelationshipIcon(link.relationshipType)}
              label={link.billNumber}
              size="small"
              color={getRelationshipColor(link.relationshipType)}
              variant="outlined"
              onClick={() => onBillClick?.(link.billNumber)}
              sx={{ 
                cursor: onBillClick ? 'pointer' : 'default',
                '&:hover': onBillClick ? { 
                  backgroundColor: 'action.hover',
                  transform: 'translateY(-1px)'
                } : {},
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </Tooltip>
        ))}
      </Box>
      
      {hasMore && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
      
      {/* Confidence summary */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {sortedLinks.slice(0, 3).map((link, index) => (
          <Tooltip key={index} title={`${link.billNumber}: ${link.confidence}% confidence`}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: `${getConfidenceColor(link.confidence)}.main`,
                opacity: 0.8
              }}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
} 