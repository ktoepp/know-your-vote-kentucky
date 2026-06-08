import React from 'react';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Tooltip, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ErrorIcon from '@mui/icons-material/Error';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useTheme } from '@mui/material/styles';

export type TimelineStage = {
  name: string;
  status: 'completed' | 'current' | 'upcoming' | 'critical';
  date?: string;
  description?: string;
  urgent?: boolean;
  duration?: string;
};

interface TimelineProps {
  stages: TimelineStage[];
  title?: string;
}

function isPlaceholder(value?: string) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return (
    lower.includes('no committee specified') ||
    lower.includes('no location provided') ||
    lower.includes('no duration specified') ||
    lower.includes('no date specified') ||
    lower.includes('unknown') ||
    lower.includes('placeholder')
  );
}

export const Timeline: React.FC<TimelineProps> = ({ stages, title = "Timeline" }) => {
  const theme = useTheme();

  if (!stages || stages.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No timeline stages available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {title && (
        <Typography variant="h6" component="h3" sx={{ mb: 3 }}>
          {title}
        </Typography>
      )}
      
      <Box sx={{ 
        borderLeft: `3px solid ${theme.palette.divider}`, 
        pl: 2, 
        mt: 2 
      }}>
        <List disablePadding>
          {stages.map((stage, idx) => {
            let icon = <RadioButtonUncheckedIcon color="disabled" />;
            if (stage.status === 'completed') icon = <CheckCircleIcon color="success" />;
            else if (stage.status === 'current') icon = <RadioButtonCheckedIcon color="primary" />;
            else if (stage.status === 'critical') icon = <ErrorIcon color="error" />;
            else if (stage.urgent) icon = <ScheduleIcon color="warning" />;

            return (
              <ListItem key={stage.name} alignItems="flex-start" sx={isPlaceholder(stage.name) || isPlaceholder(stage.description) ? { bgcolor: 'warning.light', color: 'black', fontWeight: 600 } : { pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant={stage.status === 'current' ? 'subtitle1' : 'body2'} sx={{ fontWeight: stage.status === 'current' ? 700 : 400 }}>
                        {stage.name}
                      </Typography>
                      {stage.date && (
                        <Tooltip title="Date of this stage" arrow>
                          <Typography variant="caption" color="text.secondary">{stage.date}</Typography>
                        </Tooltip>
                      )}
                      {stage.duration && (
                        <Tooltip title="Duration in this stage" arrow>
                          <Typography variant="caption" color="text.secondary">({stage.duration})</Typography>
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={stage.description ? (
                    <Box component="div" sx={{ 
                      fontSize: '0.75rem', 
                      lineHeight: 1.3,
                      color: 'text.secondary'
                    }}>
                      {stage.description}
                    </Box>
                  ) : null}
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};

export default Timeline; 