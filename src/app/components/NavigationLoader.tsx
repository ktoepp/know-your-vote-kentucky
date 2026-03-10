'use client';

import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  CircularProgress,
  Typography,
  LinearProgress,
  Button,
} from '@mui/material';
import {
  Refresh,
  Error,
  CheckCircle,
} from '@mui/icons-material';

interface NavigationLoaderProps {
  open: boolean;
  message?: string;
  progress?: number;
  status?: 'loading' | 'error' | 'success' | 'timeout';
  onRetry?: () => void;
  onClose?: () => void;
}

export default function NavigationLoader({
  open,
  message = 'Loading event details...',
  progress,
  status = 'loading',
  onRetry,
  onClose,
}: NavigationLoaderProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'error':
        return <Error color="error" sx={{ fontSize: 40 }} />;
      case 'success':
        return <CheckCircle color="success" sx={{ fontSize: 40 }} />;
      case 'timeout':
        return <Error color="warning" sx={{ fontSize: 40 }} />;
      default:
        return <CircularProgress size={40} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'error':
        return 'error.main';
      case 'success':
        return 'success.main';
      case 'timeout':
        return 'warning.main';
      default:
        return 'primary.main';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'error':
        return 'Failed to load event details';
      case 'success':
        return 'Event details loaded successfully';
      case 'timeout':
        return 'Request timed out. Please try again.';
      default:
        return message;
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 0,
        }
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {/* Status Icon */}
          <Box sx={{ color: getStatusColor() }}>
            {getStatusIcon()}
          </Box>

          {/* Status Message */}
          <Typography variant="h6" color="text.primary">
            {getStatusMessage()}
          </Typography>

          {/* Progress Bar */}
          {status === 'loading' && typeof progress === 'number' && (
            <Box sx={{ width: '100%', maxWidth: 300 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {progress}% complete
              </Typography>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {status === 'error' && onRetry && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={onRetry}
              >
                Retry
              </Button>
            )}
            {status === 'timeout' && onRetry && (
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={onRetry}
              >
                Try Again
              </Button>
            )}
            {onClose && (
              <Button
                variant="outlined"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </Box>

          {/* Additional Info */}
          {status === 'error' && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              The event details could not be loaded. This might be due to a network issue or the event may no longer be available.
            </Typography>
          )}
          {status === 'timeout' && (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
              The request took too long to complete. This could be due to high server load or network connectivity issues.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
} 