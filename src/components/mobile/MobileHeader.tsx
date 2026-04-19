'use client';

import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  InputBase, 
  Box, 
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Search,
  Menu,
  Home,
  Receipt,
  People,
  AccountBalance,
  Event as EventIcon,
  InfoOutlined,
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import Link from 'next/link';

const SearchWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

interface MobileHeaderProps {
  title?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export default function MobileHeader({ 
  title = "Know Your Vote KY",
  onSearch, 
  showSearch = true 
}: MobileHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const navigationItems = [
    { text: 'Home', icon: <Home />, href: '/' },
    { text: 'Bills', icon: <Receipt />, href: '/bills' },
    { text: 'Ordinances', icon: <AccountBalance />, href: '/ordinances' },
    { text: 'Meetings', icon: <EventIcon />, href: '/events' },
    { text: 'Members', icon: <People />, href: '/members' },
    { text: 'Search', icon: <Search />, href: '/search' },
    { text: 'About', icon: <InfoOutlined />, href: '/about' },
  ];

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{ 
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              color: 'primary.main'
            }}
          >
            {title}
          </Typography>

          {showSearch && (
            <Box component="form" onSubmit={handleSearch} sx={{ flexGrow: 1, maxWidth: 300 }}>
              <SearchWrapper>
                <SearchIconWrapper>
                  <Search />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search bills, members..."
                  inputProps={{ 'aria-label': 'search' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </SearchWrapper>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
            Know Your Vote KY
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            {navigationItems.map((item) => (
              <ListItem 
                key={item.text} 
                component={Link} 
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                sx={{ 
                  borderRadius: 1, 
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  }
                }}
              >
                <ListItemIcon sx={{ color: 'primary.main' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiListItemText-primary': {
                      fontWeight: 500
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
} 