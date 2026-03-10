"use client";
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useBillsData, Bill } from '../lib/useBillsData';

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

interface BillListWithRefreshProps {
  bills: Bill[];
  onRefresh: () => Promise<void>;
  loading?: boolean;
  error?: string;
}

export const BillListWithRefresh: React.FC<BillListWithRefreshProps> = ({
  bills,
  onRefresh,
  loading = false,
  error
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const theme = useTheme();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Recent Bills ({bills.length})
        </Typography>
        <Button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          startIcon={loading || isRefreshing ? <CircularProgress size={16} /> : <Refresh />}
          variant="outlined"
          size="small"
        >
          {loading || isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>
      
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {bills.map((bill, idx) => (
          <Box
            component="li"
            key={bill.id || bill.number || idx}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              mb: 2,
              p: 2,
              bgcolor: theme.palette.background.paper
            }}
          >
            <div>
              <strong>Bill Number:</strong> {formatBillNumber(bill)}
            </div>
            <div>
              <strong>Title:</strong> {bill.title || 'No title available'}
            </div>
            <div>
              <strong>Sponsor:</strong> {bill.sponsor || 'Unknown Sponsor'}
            </div>
            <div>
              <strong>Committees:</strong> {Array.isArray(bill.committees) && bill.committees.length > 0 ? bill.committees.join(', ') : 'No committee specified'}
            </div>
            <div>
              <strong>Last Action:</strong> {bill.last_action || 'No recent action'}
            </div>
            <div>
              <strong>Introduced:</strong> {bill.introduced_date || 'Unknown date'}
            </div>
            <div>
              <strong>Actions:</strong> {Array.isArray(bill.actions) && bill.actions.length > 0 ? (
                <ul>
                  {bill.actions.map((a, i) => (
                    <li key={i}>{a.actionDate || 'No date'}: {a.text || 'No action text'}</li>
                  ))}
                </ul>
              ) : (
                'No actions recorded'
              )}
            </div>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default BillListWithRefresh; 