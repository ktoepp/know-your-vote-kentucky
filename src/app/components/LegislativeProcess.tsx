import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Tooltip, 
  Chip,
  Divider,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonChecked,
  RadioButtonUnchecked,
  Error,
  Schedule,
  ExpandMore,
  Gavel,
  Person,
  Description,
  TrendingUp,
  Warning,
  Info
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useThemeUtils } from '../../components/ui/ThemeUtils';
import { alpha } from '@mui/material/styles';

export interface LegislativeStage {
  id: string;
  name: string;
  status: 'completed' | 'current' | 'upcoming' | 'critical' | 'stalled';
  date?: string;
  description?: string;
  actions?: Array<{
    date: string;
    text: string;
    chamber?: string;
    actionBy?: string;
  }>;
  urgent?: boolean;
  duration?: string;
  committee?: string;
  voteCounts?: {
    yes: number;
    no: number;
    present: number;
    notVoting: number;
  };
  amendments?: Array<{
    number: string;
    sponsor: string;
    description: string;
    status: 'adopted' | 'rejected' | 'pending';
  }>;
}

export interface LegislativeProcessProps {
  stages: LegislativeStage[];
  billNumber?: string;
  billTitle?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export const LegislativeProcess: React.FC<LegislativeProcessProps> = ({
  stages,
  billNumber,
  billTitle,
  compact = false,
  showDetails = true
}) => {
  const theme = useTheme();
  const { 
    getAdaptiveBackground, 
    getTextColor, 
    getAdaptiveBorder,
    getAdaptiveShadow 
  } = useThemeUtils();
  const isDark = theme.palette.mode === 'dark';

  const getStageIcon = (stage: LegislativeStage) => {
    if (stage.status === 'completed') {
      return <CheckCircle sx={{ color: isDark ? '#4ade80' : '#15803d', fontSize: 20 }} />;
    } else if (stage.status === 'current') {
      return <RadioButtonChecked sx={{ color: isDark ? '#3b82f6' : '#1e40af', fontSize: 20 }} />;
    } else if (stage.status === 'critical') {
      return <Error sx={{ color: isDark ? '#f87171' : '#dc2626', fontSize: 20 }} />;
    } else if (stage.status === 'stalled') {
      return <Warning sx={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: 20 }} />;
    } else if (stage.urgent) {
      return <Schedule sx={{ color: isDark ? '#fbbf24' : '#d97706', fontSize: 20 }} />;
    } else {
      return <RadioButtonUnchecked sx={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: 20 }} />;
    }
  };

  const getStageColor = (stage: LegislativeStage) => {
    if (stage.status === 'completed') return isDark ? '#4ade80' : '#15803d';
    if (stage.status === 'current') return isDark ? '#3b82f6' : '#1e40af';
    if (stage.status === 'critical') return isDark ? '#f87171' : '#dc2626';
    if (stage.status === 'stalled') return isDark ? '#fbbf24' : '#d97706';
    return isDark ? '#6b7280' : '#9ca3af';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status: LegislativeStage['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'current': return 'In Progress';
      case 'upcoming': return 'Upcoming';
      case 'critical': return 'Critical';
      case 'stalled': return 'Stalled';
      default: return 'Unknown';
    }
  };

  // Horizontal Timeline Component
  const HorizontalTimeline = () => {
    const timelineStages: Array<{ id: string; name: string; status: LegislativeStage['status'] }> = [
      { id: 'introduced', name: 'Introduced', status: 'upcoming' },
      { id: 'committee', name: 'Committee', status: 'upcoming' },
      { id: 'markup', name: 'Markup', status: 'upcoming' },
      { id: 'calendar', name: 'Calendar', status: 'upcoming' },
      { id: 'floor', name: 'Floor', status: 'upcoming' },
      { id: 'passed', name: 'Passed', status: 'upcoming' },
      { id: 'signed', name: 'Signed', status: 'upcoming' }
    ];
    const tooltips = [
      'Bill introduced to Congress',
      'Committee review and analysis',
      'Committee markup session',
      'Placed on legislative calendar',
      'Floor debate and voting',
      'Passed this chamber',
      'Signed into law'
    ];

    // Map existing stages to timeline stages
    stages.forEach(stage => {
      const timelineStage = timelineStages.find(ts => ts.id === stage.id);
      if (timelineStage) {
        timelineStage.status = stage.status;
      }
    });

    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        py: 2, 
        overflowX: 'auto' 
      }}>
        {timelineStages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip 
                title={tooltips[index]}
                arrow
                placement="top"
                componentsProps={{ tooltip: { sx: { maxWidth: 200, fontSize: '0.75rem' }}}}
              >
                <span>
                  {stage.status === 'completed' ? (
                    <CheckCircle sx={{ fontSize: 'small', color: 'success.main' }} />
                  ) : stage.status === 'current' ? (
                    <RadioButtonChecked sx={{ fontSize: 'small', color: 'primary.main' }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ fontSize: 'small', color: 'action.disabled' }} />
                  )}
                </span>
              </Tooltip>
            </Box>
            
            {/* Connection line (except after last stage) */}
            {index < timelineStages.length - 1 && (
              <Box sx={{ 
                height: 2, 
                width: 24, 
                bgcolor: stage.status === 'completed' ? 'success.main' : 'action.disabled' 
              }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    );
  };

  if (compact) {
    return (
      <Box sx={{ mt: 2 }}>
        <HorizontalTimeline />
      </Box>
    );
  }

  return (
    <Card sx={{ 
      mb: 3,
      bgcolor: getAdaptiveBackground('#ffffff', '#1f2937'),
      border: getAdaptiveBorder('#e5e7eb', '#374151'),
      boxShadow: getAdaptiveShadow('0 2px 8px rgba(0,0,0,0.08)', '0 2px 12px rgba(255,255,255,0.08)')
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Gavel sx={{ color: getStageColor(stages.find(s => s.status === 'current') || stages[0]), fontSize: 24 }} />
          <Box>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: getTextColor('primary')
            }}>
              Legislative Journey
            </Typography>
            {billNumber && (
              <Typography variant="body2" sx={{ 
                color: getTextColor('secondary'),
                fontWeight: 500
              }}>
                {billNumber}
              </Typography>
            )}
          </Box>
        </Box>

        <HorizontalTimeline />

        {/* Detailed stages information */}
        <Box sx={{ 
          borderLeft: `3px solid ${getAdaptiveBorder('#e5e7eb', '#374151')}`,
          pl: 3,
          mt: 3
        }}>
          <List disablePadding>
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.id}>
                <ListItem sx={{ pl: 0, py: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getStageIcon(stage)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ 
                          fontWeight: stage.status === 'current' ? 700 : 600,
                          color: getTextColor('primary')
                        }}>
                          {stage.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(stage.status)}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 20,
                            color: getStageColor(stage),
                            backgroundColor: theme.palette.mode === 'dark'
                              ? alpha(getStageColor(stage), 0.7)
                              : alpha(getStageColor(stage), 0.12),
                            fontWeight: 500,
                            whiteSpace: 'normal',
                            textOverflow: 'clip',
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                            maxWidth: '100%'
                          }}
                        />
                        {stage.urgent && (
                          <Chip
                            label="Urgent"
                            size="small"
                            color="warning"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 500,
                              backgroundColor: theme.palette.mode === 'dark'
                                ? alpha(theme.palette.warning.main, 0.7)
                                : alpha(theme.palette.warning.main, 0.12),
                              color: theme.palette.mode === 'dark'
                                ? theme.palette.warning.contrastText
                                : theme.palette.warning.main,
                              whiteSpace: 'normal',
                              textOverflow: 'clip',
                              overflowWrap: 'break-word',
                              wordBreak: 'break-word',
                              maxWidth: '100%'
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        {stage.description && (
                          <Box component="div" sx={{ 
                            color: getTextColor('secondary'),
                            mb: 1,
                            fontSize: '0.875rem',
                            lineHeight: 1.5
                          }}>
                            {stage.description}
                          </Box>
                        )}
                        
                        {stage.date && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Schedule sx={{ fontSize: 16, color: getTextColor('secondary') }} />
                            <Box component="div" sx={{ 
                              color: getTextColor('secondary'),
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              lineHeight: 1.3
                            }}>
                              {formatDate(stage.date)}
                            </Box>
                          </Box>
                        )}

                        {stage.committee && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Person sx={{ fontSize: 16, color: getTextColor('secondary') }} />
                            <Box component="div" sx={{ 
                              color: getTextColor('secondary'),
                              fontSize: '0.75rem',
                              lineHeight: 1.3
                            }}>
                              {stage.committee}
                            </Box>
                          </Box>
                        )}

                        {stage.voteCounts && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <Box component="div" sx={{ 
                              color: getTextColor('secondary'),
                              fontWeight: 500,
                              fontSize: '0.75rem',
                              lineHeight: 1.3
                            }}>
                              Vote Results:
                            </Box>
                            <Chip label={`Yes: ${stage.voteCounts.yes}`} size="small" color="success" sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500, backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.success.main, 0.7) : alpha(theme.palette.success.main, 0.12), color: theme.palette.mode === 'dark' ? theme.palette.success.contrastText : theme.palette.success.main, whiteSpace: 'normal', textOverflow: 'clip', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }} />
                            <Chip label={`No: ${stage.voteCounts.no}`} size="small" color="error" sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500, backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.error.main, 0.7) : alpha(theme.palette.error.main, 0.12), color: theme.palette.mode === 'dark' ? theme.palette.error.contrastText : theme.palette.error.main, whiteSpace: 'normal', textOverflow: 'clip', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }} />
                            {stage.voteCounts.present > 0 && (
                              <Chip label={`Present: ${stage.voteCounts.present}`} size="small" color="warning" sx={{ fontSize: '0.7rem', height: 20, fontWeight: 500, backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.warning.main, 0.7) : alpha(theme.palette.warning.main, 0.12), color: theme.palette.mode === 'dark' ? theme.palette.warning.contrastText : theme.palette.warning.main, whiteSpace: 'normal', textOverflow: 'clip', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }} />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Box>
      </CardContent>
    </Card>
  );
};