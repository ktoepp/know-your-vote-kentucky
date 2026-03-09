'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import {
  Construction,
  ArrowBack,
} from '@mui/icons-material';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import { useThemeUtils } from '@/components/ui/ThemeUtils';

interface ComingSoonPageProps {
  title: string;
  description: string;
  features?: Array<{
    icon: React.ReactElement;
    label: string;
  }>;
  backHref?: string;
}

export default function ComingSoonPage({
  title,
  description,
  features = [],
  backHref = '/',
}: ComingSoonPageProps) {
  const theme = useTheme();
  const { getAdaptiveBackground, getAdaptiveBorder } = useThemeUtils();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          component={Link}
          href={backHref}
          startIcon={<ArrowBack />}
          sx={{
            mb: 3,
            color: theme.palette.text.secondary,
            '&:hover': {
              color: theme.palette.primary.main,
            },
          }}
        >
          Back to Home
        </Button>
        
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            background: getAdaptiveBackground('rgba(255,255,255,0.8)', 'rgba(30,30,30,0.8)'),
            border: `1px solid ${getAdaptiveBorder('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.1)')}`,
            borderRadius: 3,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Construction
            sx={{
              fontSize: 64,
              color: theme.palette.warning.main,
              mb: 2,
            }}
          />
          
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Coming Soon
          </Typography>
          
          <Typography
            variant="h5"
            component="h2"
            sx={{
              color: theme.palette.text.secondary,
              mb: 3,
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              fontSize: '1.1rem',
              lineHeight: 1.7,
              color: theme.palette.text.secondary,
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            {description}
          </Typography>
          
          {features.length > 0 && (
            <Stack
              direction="row"
              spacing={2}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ mb: 4 }}
            >
              {features.map((feature, index) => (
                <Chip
                  key={index}
                  icon={feature.icon}
                  label={feature.label}
                  variant="outlined"
                  sx={{ borderColor: theme.palette.primary.main }}
                />
              ))}
            </Stack>
          )}
          
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.disabled,
              fontStyle: 'italic',
            }}
          >
            This page is under active development. Check back soon for updates!
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
} 