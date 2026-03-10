'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Chip, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
  Fab,
  useTheme
} from '@mui/material';
import { 
  Refresh, 
  Gavel, 
  HowToVote, 
  Event, 
  Person,
  TrendingUp,
  Schedule,
  CalendarToday
} from '@mui/icons-material';
import { useBillsData, Bill } from '../lib/useBillsData';

// Utility function to format bill number with prefix
const formatBillNumber = (bill: Bill) => {
  if (!bill.number) return 'Unknown Bill';
  const prefix = bill.chamber === 'senate' ? 'S.' : 'H.R.';
  return `${prefix} ${bill.number}`;
};

interface ActivityItem {
  id: string;
  type: 'bill_introduced' | 'bill_action' | 'vote' | 'hearing' | 'amendment';
  title: string;
  description: string;
  date: string;
  billNumber?: string;
  billTitle?: string;
  member?: string;
  committee?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export default function ActivityPage() {
  const theme = useTheme();
  const { bills, loading, error, refresh } = useBillsData();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Generate activity from bills data
  useEffect(() => {
    if (bills.length > 0) {
      const activityItems: ActivityItem[] = [];
      
      bills.forEach(bill => {
        // Add bill introduction activity
        if (bill.introduced_date) {
          activityItems.push({
            id: `intro-${bill.id}`,
            type: 'bill_introduced',
            title: `New Bill Introduced: ${bill.title || `H.R. ${bill.number}`}`,
            description: `A new bill has been introduced in the ${bill.chamber || 'House'}.`,
            date: bill.introduced_date,
            billNumber: bill.number ? `H.R. ${bill.number}` : undefined,
            billTitle: bill.title,
            member: bill.sponsor,
            urgency: bill.priority && bill.priority >= 7 ? 'high' : 'medium'
          });
        }

        // Add bill action activity
        if (bill.last_action) {
          activityItems.push({
            id: `action-${bill.id}`,
            type: 'bill_action',
            title: `Bill Action: ${bill.title || `H.R. ${bill.number}`}`,
            description: bill.last_action,
            date: bill.introduced_date || new Date().toISOString(),
            billNumber: bill.number ? `H.R. ${bill.number}` : undefined,
            billTitle: bill.title,
            urgency: 'medium'
          });
        }
      });

      // Sort by date (most recent first)
      activityItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(activityItems.slice(0, 20)); // Limit to 20 most recent
    }
  }, [bills]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'bill_introduced':
        return <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} />;
      case 'bill_action':
        return <TrendingUp sx={{ fontSize: '1.2rem', color: 'info.main' }} />;
      case 'vote':
        return <Person sx={{ fontSize: '1.2rem', color: 'success.main' }} />;
      case 'hearing':
        return <CalendarToday sx={{ fontSize: '1.2rem', color: 'warning.main' }} />;
      case 'amendment':
        return <Gavel sx={{ fontSize: '1.2rem', color: 'secondary.main' }} />;
      default:
        return <TrendingUp sx={{ fontSize: '1.2rem', color: 'primary.main' }} />;
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    switch (type) {
      case 'bill_introduced':
        return 'New Bill';
      case 'bill_action':
        return 'Action';
      case 'vote':
        return 'Vote';
      case 'hearing':
        return 'Hearing';
      case 'amendment':
        return 'Amendment';
      default:
        return 'Activity';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: theme.palette.background.default,
      color: theme.palette.text.primary
    }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            mb: 1,
            color: theme.palette.text.primary
          }}>
            Recent Activity
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
            Stay updated on the latest congressional developments
          </Typography>
        </Box>

        {/* Activity Stats */}
        <Card sx={{ 
          mb: 3, 
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.primary.main 
                }}>
                  {activities.filter(a => a.type === 'bill_introduced').length}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  New Bills
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.info.main 
                }}>
                  {activities.filter(a => a.type === 'bill_action').length}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Actions
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.warning.main 
                }}>
                  {activities.filter(a => a.urgency === 'high').length}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  High Priority
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Activity List */}
        <Box sx={{ pb: 8 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : activities.length === 0 ? (
            <Card sx={{ 
              borderRadius: 2,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ 
                  color: theme.palette.text.secondary, 
                  mb: 1
                }}>
                  No recent activity
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                  Check back later for updates on congressional activity
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <List sx={{ p: 0 }}>
              {activities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <Card sx={{ 
                    mb: 2, 
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s ease-in-out',
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: theme.palette.primary.main + '20'
                        }}>
                          {getActivityIcon(activity.type)}
                        </Box>
                        
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600, 
                              lineHeight: 1.3,
                              color: theme.palette.text.primary
                            }}>
                              {activity.title}
                            </Typography>
                            <Chip
                              label={getActivityTypeLabel(activity.type)}
                              size="small"
                              color={getUrgencyColor(activity.urgency) as any}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          </Box>
                          
                          <Typography variant="body2" sx={{ 
                            mb: 1, 
                            lineHeight: 1.5,
                            color: theme.palette.text.secondary
                          }}>
                            {activity.description}
                          </Typography>
                          
                          {activity.billNumber && (
                            <Typography variant="body2" sx={{ 
                              fontWeight: 500, 
                              color: theme.palette.primary.main, 
                              mb: 1 
                            }}>
                              {activity.billNumber}
                            </Typography>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                              {formatDate(activity.date)}
                            </Typography>
                            {activity.member && (
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                {activity.member}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                  {index < activities.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Refresh FAB */}
        <Fab
          color="primary"
          aria-label="refresh"
          onClick={refresh}
          disabled={loading}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <Refresh />
        </Fab>
      </Container>
    </Box>
  );
} 