import React from 'react';
import { Box, LinearProgress, Typography, Button, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatusBarProps {
  loading?: boolean;
  progress?: number;
  status?: string;
  updatedAgo?: string;
  newContent?: boolean;
  onRefresh?: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ loading, progress, status, updatedAgo, newContent, onRefresh }) => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 1, bgcolor: theme => theme.palette.background.default, display: 'flex', alignItems: 'center', gap: 2 }}>
      {loading && <CircularProgress size={20} sx={{ mr: 2 }} />}
      {typeof progress === 'number' && progress < 100 && (
        <Box sx={{ flexGrow: 1, mr: 2 }}><LinearProgress variant="determinate" value={progress} /></Box>
      )}
      <Typography variant="body2" sx={{ flexGrow: 1 }}>{status || 'Idle'}</Typography>
      {updatedAgo && <Typography variant="caption" color="text.secondary">Database updated {updatedAgo} ago</Typography>}
      {newContent && (
        <Button color="primary" variant="contained" size="small" onClick={onRefresh}>New content available - Click to refresh</Button>
      )}
    </Box>
  );
};

export default StatusBar; 