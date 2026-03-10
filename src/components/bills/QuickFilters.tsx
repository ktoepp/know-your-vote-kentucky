'use client';

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { FilterList } from '@mui/icons-material';

interface FilterOption {
  id: string;
  label: string;
  count?: number;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

interface QuickFiltersProps {
  filters: FilterOption[];
  selectedFilters: string[];
  onFilterChange: (filterId: string) => void;
  title?: string;
}

export default function QuickFilters({ 
  filters, 
  selectedFilters, 
  onFilterChange, 
  title = "Filter Bills" 
}: QuickFiltersProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FilterList sx={{ fontSize: '1.2rem', color: 'text.secondary' }} />
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        overflowX: 'auto',
        pb: 1,
        '&::-webkit-scrollbar': {
          height: 4,
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(0,0,0,0.2)',
          borderRadius: 2,
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'rgba(0,0,0,0.3)',
        },
      }}>
        {filters.map((filter) => (
          <Chip
            key={filter.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <Box sx={{ 
                    backgroundColor: 'rgba(0,0,0,0.1)', 
                    borderRadius: '50%', 
                    width: 16, 
                    height: 16, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    {filter.count}
                  </Box>
                )}
              </Box>
            }
            onClick={() => onFilterChange(filter.id)}
            variant={selectedFilters.includes(filter.id) ? 'filled' : 'outlined'}
            color={selectedFilters.includes(filter.id) ? (filter.color || 'primary') : 'default'}
            sx={{
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              height: 32,
              fontSize: '0.8rem',
              fontWeight: selectedFilters.includes(filter.id) ? 600 : 500,
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              },
              transition: 'all 0.2s ease',
            }}
          />
        ))}
      </Box>
    </Box>
  );
} 