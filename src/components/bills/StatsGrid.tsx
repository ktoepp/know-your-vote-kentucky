'use client';

import React from 'react';
import { Grid, Card, CardContent, Typography, Box, useTheme } from '@mui/material';
import { 
  TrendingUp, 
  Schedule, 
  Gavel, 
  CheckCircle, 
  Warning, 
  Error 
} from '@mui/icons-material';

interface StatCard {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

interface StatsGridProps {
  stats: StatCard[];
  columns?: 2 | 3;
}

export default function StatsGrid({ stats, columns = 2 }: StatsGridProps) {
  const theme = useTheme();
  
  const getColorValue = (color: string) => {
    const colors = {
      primary: theme.palette.primary.main,
      secondary: theme.palette.secondary.main,
      success: theme.palette.success.main,
      warning: theme.palette.warning.main,
      error: theme.palette.error.main,
      info: theme.palette.info.main
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const formatValue = (value: number | string) => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toString();
    }
    return value;
  };

  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', sm: columns === 2 ? '1fr 1fr' : '1fr 1fr 1fr' },
      gap: 2, 
      mb: 3 
    }}>
      {stats.map((stat) => (
        <Card 
          key={stat.id}
          sx={{ 
            height: '100%',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 20px rgba(255,255,255,0.15)' 
                : '0 4px 20px rgba(0,0,0,0.15)'
            }
          }}
        >
          <CardContent sx={{ p: 2.5, color: theme.palette.text.primary }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: `${getColorValue(stat.color)}15`,
                  color: getColorValue(stat.color)
                }}
              >
                {stat.icon}
              </Box>
              {stat.change !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TrendingUp 
                    sx={{ 
                      fontSize: '1rem', 
                      color: stat.change >= 0 ? theme.palette.success.main : theme.palette.error.main,
                      transform: stat.change < 0 ? 'rotate(180deg)' : 'none'
                    }} 
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      color: stat.change >= 0 ? theme.palette.success.main : theme.palette.error.main
                    }}
                  >
                    {stat.change >= 0 ? '+' : ''}{stat.change}%
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                color: theme.palette.text.primary,
                fontSize: '1.8rem'
              }}
            >
              {formatValue(stat.value)}
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600, 
                color: theme.palette.text.secondary,
                mb: stat.description ? 0.5 : 0
              }}
            >
              {stat.title}
            </Typography>
            
            {stat.description && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  lineHeight: 1.3
                }}
              >
                {stat.description}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// Predefined stat configurations
export const getDefaultStats = (bills: any[]) => {
  const totalBills = bills.length;
  const recentBills = bills.filter(bill => {
    const introDate = new Date(bill.introduced_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return introDate >= thirtyDaysAgo;
  }).length;
  
  const highPriorityBills = bills.filter(bill => bill.priority && bill.priority >= 7).length;
  const activeBills = bills.filter(bill => bill.last_action && 
    bill.last_action.toLowerCase().includes('reported') || 
    bill.last_action.toLowerCase().includes('passed')
  ).length;

  return [
    {
      id: 'total-bills',
      title: 'Total Bills',
      value: totalBills,
      icon: <Gavel sx={{ fontSize: '1.2rem' }} />,
      color: 'primary' as const,
      description: 'All tracked legislation'
    },
    {
      id: 'recent-bills',
      title: 'Recent Bills',
      value: recentBills,
      icon: <Schedule sx={{ fontSize: '1.2rem' }} />,
      color: 'info' as const,
      description: 'Introduced last 30 days'
    },
    {
      id: 'high-priority',
      title: 'High Priority',
      value: highPriorityBills,
      icon: <Warning sx={{ fontSize: '1.2rem' }} />,
      color: 'warning' as const,
      description: 'Priority level 7+'
    },
    {
      id: 'active-bills',
      title: 'Active Bills',
      value: activeBills,
      icon: <CheckCircle sx={{ fontSize: '1.2rem' }} />,
      color: 'success' as const,
      description: 'Moving through process'
    }
  ];
}; 