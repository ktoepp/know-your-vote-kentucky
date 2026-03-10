import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Info,
  Star,
  StarBorder,
  FlashOn,
  Public,
  Gavel,
  Schedule
} from '@mui/icons-material';
import { ThemedIcon } from '@/lib/icons';

interface RelevanceScore {
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
}

interface PoliticalIntelligence {
  type: 'breaking' | 'background' | 'sleeper' | 'routine';
  urgency: 'critical' | 'high' | 'medium' | 'low';
  impact: 'national' | 'regional' | 'committee' | 'procedural';
  drama: 'high' | 'medium' | 'low';
  predictions: string[];
  context: string;
  relatedIssues: string[];
}

interface PoliticalIntelligenceCardProps {
  relevanceScore?: RelevanceScore;
  politicalIntelligence?: PoliticalIntelligence;
  compact?: boolean;
}

export default function PoliticalIntelligenceCard({
  relevanceScore,
  politicalIntelligence,
  compact = false
}: PoliticalIntelligenceCardProps) {
  const theme = useTheme();
  
  if (!relevanceScore && !politicalIntelligence) {
    return null;
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'breaking': return 'error';
      case 'background': return 'warning';
      case 'sleeper': return 'info';
      case 'routine': return 'default';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'national': return <ThemedIcon icon={Public} color="primary" />;
      case 'regional': return <ThemedIcon icon={Gavel} color="secondary" />;
      case 'committee': return <ThemedIcon icon={Info} color="info" />;
      case 'procedural': return <ThemedIcon icon={Schedule} color="warning" />;
      default: return <ThemedIcon icon={Info} color="info" />;
    }
  };

  const getDramaIcon = (drama: string) => {
    switch (drama) {
      case 'high': return <ThemedIcon icon={FlashOn} color="error" />;
      case 'medium': return <ThemedIcon icon={TrendingUp} color="warning" />;
      case 'low': return <ThemedIcon icon={TrendingDown} color="success" />;
      default: return <ThemedIcon icon={Info} color="info" />;
    }
  };

  if (compact) {
    return (
      <Box sx={{ mt: 1 }}>
        {relevanceScore && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              icon={<ThemedIcon icon={Star} color="primary" />}
              label={`Score: ${relevanceScore.score}`}
              size="small"
              color={relevanceScore.score >= 80 ? 'error' : relevanceScore.score >= 60 ? 'warning' : 'default'}
              variant="outlined"
            />
            {relevanceScore.tags.slice(0, 2).map((tag, index) => (
              <Chip
                key={`tag-${tag}-${index}`}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        )}
        
        {politicalIntelligence && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={politicalIntelligence.type.toUpperCase()}
              size="small"
              color={getTypeColor(politicalIntelligence.type)}
              variant="outlined"
            />
            <Chip
              icon={getImpactIcon(politicalIntelligence.impact)}
              label={politicalIntelligence.impact}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={getDramaIcon(politicalIntelligence.drama)}
              label={politicalIntelligence.drama}
              size="small"
              variant="outlined"
            />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.action.hover, borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight="600" gutterBottom>
        Political Intelligence
      </Typography>
      
      {relevanceScore && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="body2" fontWeight="600">
              Relevance Score: {relevanceScore.score}/100
            </Typography>
            {relevanceScore.score >= 80 && <Star color="error" />}
            {relevanceScore.score >= 60 && relevanceScore.score < 80 && <Star color="warning" />}
            {relevanceScore.score < 60 && <StarBorder color="action" />}
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={relevanceScore.score}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: theme.palette.divider,
              '& .MuiLinearProgress-bar': {
                bgcolor: relevanceScore.score >= 80 ? theme.palette.error.main : 
                        relevanceScore.score >= 60 ? theme.palette.warning.main : theme.palette.primary.main
              }
            }}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {relevanceScore.tags.map((tag, index) => (
              <Chip
                key={`tag-${tag}-${index}`}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
          
          {relevanceScore.reasoning.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Why this matters: {relevanceScore.reasoning.slice(0, 2).join(', ')}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      
      {politicalIntelligence && (
        <Box>
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Chip
              label={politicalIntelligence.type.toUpperCase()}
              color={getTypeColor(politicalIntelligence.type)}
              variant="filled"
              size="small"
            />
            <Chip
              icon={getImpactIcon(politicalIntelligence.impact)}
              label={politicalIntelligence.impact}
              variant="outlined"
              size="small"
            />
            <Chip
              icon={getDramaIcon(politicalIntelligence.drama)}
              label={politicalIntelligence.drama}
              variant="outlined"
              size="small"
            />
            <Chip
              label={politicalIntelligence.urgency}
              color={getUrgencyColor(politicalIntelligence.urgency)}
              variant="outlined"
              size="small"
            />
          </Box>
          
          {politicalIntelligence.predictions.length > 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight="600">
                Predictions:
              </Typography>
              <Typography variant="caption" display="block">
                {politicalIntelligence.predictions.slice(0, 2).join(' • ')}
              </Typography>
            </Alert>
          )}
          
          {politicalIntelligence.context && (
            <Typography variant="caption" color="text.secondary" display="block">
              {politicalIntelligence.context}
            </Typography>
          )}
          
          {politicalIntelligence.relatedIssues.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ 
                color: 'text.disabled', 
                fontWeight: 400, 
                display: 'block',
                fontSize: '0.65rem',
                opacity: 0.6
              }}>
                Related Issues:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {politicalIntelligence.relatedIssues.slice(0, 3).map((issue, index) => (
                  <Chip
                    key={`issue-${issue}-${index}`}
                    label={issue}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem' }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
} 