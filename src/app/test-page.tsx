'use client';

import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CustomChartIcon, ThemedIcon, BarChart, PieChart, ShowChart } from '@/lib/icons';

export default function TestPage() {
  const theme = useTheme();

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      <Typography variant="h1" sx={{ color: 'text.primary', mb: 4 }}>
        Icon Theming Test
      </Typography>

      <Grid container spacing={4}>
        {/* Custom Chart Icon */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              Custom Chart Icon (Your SVG)
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <CustomChartIcon />
              <CustomChartIcon sx={{ width: 32, height: 32 }} />
              <CustomChartIcon sx={{ width: 48, height: 48 }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This icon automatically adapts to dark/light mode
            </Typography>
          </Paper>
        </Grid>

        {/* Themed Icons */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              Themed Icons
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <ThemedIcon icon={BarChart} color="primary" />
              <ThemedIcon icon={PieChart} color="secondary" />
              <ThemedIcon icon={ShowChart} color="success" />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              These icons automatically adapt to the current theme
            </Typography>
          </Paper>
        </Grid>

        {/* Different Sizes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              Different Sizes
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <ThemedIcon icon={BarChart} size="small" />
              <ThemedIcon icon={BarChart} size="medium" />
              <ThemedIcon icon={BarChart} size="large" />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Small (16px), Medium (24px), Large (32px)
            </Typography>
          </Paper>
        </Grid>

        {/* Different Colors */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
              Different Colors
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
              <ThemedIcon icon={BarChart} color="primary" />
              <ThemedIcon icon={BarChart} color="secondary" />
              <ThemedIcon icon={BarChart} color="success" />
              <ThemedIcon icon={BarChart} color="warning" />
              <ThemedIcon icon={BarChart} color="error" />
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Each color adapts to dark/light mode
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 