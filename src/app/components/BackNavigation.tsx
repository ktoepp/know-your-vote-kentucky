'use client';

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Breadcrumbs,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Home,
  Search,
  AccountTree,
  Timeline,
  Topic,
  Business,
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface BackNavigationProps {
  eventTitle?: string;
  committee?: string;
  className?: string;
}

export default function BackNavigation({ 
  eventTitle, 
  committee,
  className = '' 
}: BackNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const from = searchParams?.get('from');
  const query = searchParams?.get('query');
  const search = searchParams?.get('search');
  const speaker = searchParams?.get('speaker');
  const topic = searchParams?.get('topic');
  const bill = searchParams?.get('bill');
  const dateFrom = searchParams?.get('dateFrom');
  const dateTo = searchParams?.get('dateTo');

  const getBackLinkText = () => {
    switch (from) {
      case 'search':
        return query ? `Back to Search: "${query}"` : 'Back to Search Results';
      case 'graph':
        return 'Back to Network View';
      case 'topic':
        return topic ? `Back to ${topic} Events` : 'Back to Topic View';
      case 'committee':
        return committee ? `Back to ${committee}` : 'Back to Committee View';
      case 'timeline':
        return 'Back to Timeline';
      case 'table':
        return 'Back to Event Database';
      case 'dashboard':
        return 'Back to Dashboard';
      default:
        return 'Back to Events';
    }
  };

  const getBackLinkUrl = () => {
    const baseUrl = (() => {
      switch (from) {
        case 'search':
          return '/search';
        case 'graph':
          return '/explore';
        case 'topic':
          return '/explore';
        case 'committee':
          return '/explore';
        case 'timeline':
          return '/explore';
        case 'table':
          return '/table';
        case 'dashboard':
          return '/dashboard';
        default:
          return '/events';
      }
    })();

    const params = new URLSearchParams();
    
    // Preserve search context
    if (query) params.set('query', query);
    if (search) params.set('search', search);
    if (speaker) params.set('speaker', speaker);
    if (topic) params.set('topic', topic);
    if (bill) params.set('bill', bill);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    
    // Add discovery context
    if (from) params.set('from', from);
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  const getBreadcrumbs = () => {
    const breadcrumbs: Array<{ label: string; href: string; icon: React.ReactNode | null }> = [
      { label: 'Home', href: '/', icon: <Home fontSize="small" /> }
    ];

    switch (from) {
      case 'search':
        breadcrumbs.push(
          { label: 'Search', href: '/search', icon: <Search fontSize="small" /> },
          { label: query || 'Results', href: '/search', icon: null }
        );
        break;
      case 'graph':
        breadcrumbs.push(
          { label: 'Network View', href: '/explore', icon: <AccountTree fontSize="small" /> }
        );
        break;
      case 'topic':
        breadcrumbs.push(
          { label: 'Topics', href: '/explore', icon: <Topic fontSize="small" /> },
          { label: topic || 'Topic Events', href: '/explore', icon: null }
        );
        break;
      case 'committee':
        breadcrumbs.push(
          { label: 'Committees', href: '/explore', icon: <Business fontSize="small" /> },
          { label: committee || 'Committee', href: '/explore', icon: null }
        );
        break;
      case 'timeline':
        breadcrumbs.push(
          { label: 'Timeline', href: '/explore', icon: <Timeline fontSize="small" /> }
        );
        break;
      case 'table':
        breadcrumbs.push(
          { label: 'Event Database', href: '/table', icon: <Search fontSize="small" /> }
        );
        break;
      case 'dashboard':
        breadcrumbs.push(
          { label: 'Dashboard', href: '/dashboard', icon: <Home fontSize="small" /> }
        );
        break;
      default:
        breadcrumbs.push(
          { label: 'Events', href: '/events', icon: <Search fontSize="small" /> }
        );
    }

    if (eventTitle) {
      breadcrumbs.push({ label: eventTitle, href: '#', icon: null });
    }

    return breadcrumbs;
  };

  const handleBackClick = () => {
    const backUrl = getBackLinkUrl();
    router.push(backUrl);
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box className={className} sx={{ mb: 3 }}>
      {/* Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBackClick}
          sx={{ minWidth: 'auto' }}
        >
          {getBackLinkText()}
        </Button>
        
        {/* Context Indicators */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {from && (
            <Chip
              label={from}
              size="small"
              variant="outlined"
              color="primary"
            />
          )}
          {query && (
            <Chip
              label={`Query: "${query}"`}
              size="small"
              variant="outlined"
              color="secondary"
            />
          )}
          {topic && (
            <Chip
              label={`Topic: ${topic}`}
              size="small"
              variant="outlined"
              color="info"
            />
          )}
          {speaker && (
            <Chip
              label={`Speaker: ${speaker}`}
              size="small"
              variant="outlined"
              color="success"
            />
          )}
        </Box>
      </Box>

      {/* Breadcrumbs */}
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ 
          '& .MuiBreadcrumbs-ol': { 
            flexWrap: 'wrap',
            gap: 0.5
          }
        }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isClickable = !isLast && crumb.href !== '#';
          
          const content = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {crumb.icon}
              <Typography
                variant="body2"
                color={isLast ? 'text.primary' : 'text.secondary'}
                sx={{
                  fontWeight: isLast ? 600 : 400,
                  textDecoration: isClickable ? 'underline' : 'none',
                  cursor: isClickable ? 'pointer' : 'default',
                  '&:hover': isClickable ? { color: 'primary.main' } : {}
                }}
              >
                {crumb.label}
              </Typography>
            </Box>
          );

          if (isClickable) {
            return (
              <Link key={index} href={crumb.href} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            );
          }

          return (
            <Box key={index}>
              {content}
            </Box>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
} 