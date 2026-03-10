'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  Visibility,
  Search,
  ArrowForward,
  Refresh,
  Schedule
} from '@mui/icons-material';
import { TrendingBill } from '../lib/trending-bills';

interface TrendingBillsSidebarProps {
  maxBills?: number;
  rotationInterval?: number;
  onBillClick?: (bill: TrendingBill) => void;
}

export default function TrendingBillsSidebar({
  maxBills = 5,
  rotationInterval = 5000,
  onBillClick
}: TrendingBillsSidebarProps) {
  const theme = useTheme();
  const [trendingBills, setTrendingBills] = useState<TrendingBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Fetch trending bills
  const fetchTrendingBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/trending-bills?limit=${maxBills}&stats=true`);
      const data = await response.json();
      
      if (data.success) {
        setTrendingBills(data.trendingBills);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to fetch trending bills');
      }
    } catch (err) {
      setError('Network error while fetching trending bills');
    } finally {
      setLoading(false);
    }
  };

  // Track bill interaction
  const trackBillInteraction = async (bill: TrendingBill, interactionType: 'click' | 'search') => {
    try {
      await fetch('/api/trending-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: bill.id,
          billData: bill,
          interactionType
        })
      });
    } catch (err) {
      console.error('Failed to track bill interaction:', err);
    }
  };

  // Handle bill click
  const handleBillClick = (bill: TrendingBill) => {
    trackBillInteraction(bill, 'click');
    if (onBillClick) {
      onBillClick(bill);
    }
  };

  // Handle bill search
  const handleBillSearch = (bill: TrendingBill) => {
    trackBillInteraction(bill, 'search');
    // You can implement search functionality here
    console.log('Search for bill:', bill.title);
  };

  // Rotate through bills
  useEffect(() => {
    if (trendingBills.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % trendingBills.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [trendingBills.length, rotationInterval]);

  // Initial fetch
  useEffect(() => {
    fetchTrendingBills();
  }, [maxBills]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchTrendingBills, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getPartyColor = (party: string) => {
    switch (party?.toUpperCase()) {
      case 'D': return theme.palette.primary.main;
      case 'R': return theme.palette.error.main;
      case 'I': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  const getChamberIcon = (chamber: string) => {
    switch (chamber?.toLowerCase()) {
      case 'house': return '🏛️';
      case 'senate': return '🏛️';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <Card sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <IconButton size="small" onClick={fetchTrendingBills}>
              <Refresh />
            </IconButton>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (trendingBills.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            Trending Bills
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No trending bills yet. Bills will appear here as users interact with them.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const currentBill = trendingBills[currentIndex];

  return (
    <Card sx={{ height: 'fit-content' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
            Trending Bills
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchTrendingBills}>
                <Refresh />
              </IconButton>
            </Tooltip>
            {stats && (
              <Chip
                size="small"
                label={`${stats.totalBills} bills`}
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {/* Current Bill Display */}
        <Fade in={true} timeout={500}>
          <Box>
            {/* Bill Title */}
            <Typography
              variant="h6"
              sx={{
                cursor: 'pointer',
                '&:hover': { color: theme.palette.primary.main },
                mb: 1
              }}
              onClick={() => handleBillClick(currentBill)}
            >
              {currentBill.title}
            </Typography>

            {/* Bill Details */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {getChamberIcon(currentBill.chamber)} {currentBill.billNumber} • {currentBill.chamber}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2">
                  Sponsor: {currentBill.sponsor}
                </Typography>
                <Chip
                  size="small"
                  label={currentBill.party}
                  sx={{
                    backgroundColor: getPartyColor(currentBill.party),
                    color: 'white',
                    fontSize: '0.7rem'
                  }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Last Action: {currentBill.lastAction}
              </Typography>
            </Box>

            {/* Interaction Stats */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Visibility fontSize="small" color="action" />
                <Typography variant="caption">
                  {currentBill.clickCount} views
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Search fontSize="small" color="action" />
                <Typography variant="caption">
                  {currentBill.searchCount} searches
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="View Bill Details">
                <IconButton
                  size="small"
                  onClick={() => handleBillClick(currentBill)}
                  sx={{ color: theme.palette.primary.main }}
                >
                  <ArrowForward />
                </IconButton>
              </Tooltip>
              <Tooltip title="Search Related Content">
                <IconButton
                  size="small"
                  onClick={() => handleBillSearch(currentBill)}
                  sx={{ color: theme.palette.secondary.main }}
                >
                  <Search />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Fade>

        {/* Rotation Indicator */}
        {trendingBills.length > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            {trendingBills.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: index === currentIndex 
                    ? theme.palette.primary.main 
                    : theme.palette.grey[300],
                  mx: 0.5,
                  transition: 'background-color 0.3s'
                }}
              />
            ))}
          </Box>
        )}

        {/* Quick Stats */}
        {stats && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              Total interactions: {stats.totalClicks + stats.totalSearches}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
} 