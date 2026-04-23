'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Explore,
  CloudUpload,
  ListAlt,
  Brightness4,
  Brightness7,
  SettingsBrightness,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@mui/material/styles';

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Bills',
    path: '/bills',
    icon: <ListAlt />,
  },
  {
    label: 'Members',
    path: '/members',
    icon: <Explore />,
  },
];

export default function ProfessionalNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    // Implement theme change logic here
    handleThemeMenuClose();
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const drawer = (
    <Box sx={{ width: 280 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
              }}
            >
              KY
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Know Your Vote KY
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kentucky Civic Engagement
              </Typography>
            </Box>
          </Box>
        </Link>
      </Box>
      
      <List sx={{ pt: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <Link href={item.path} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
              <ListItemButton
                selected={isActive(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive(item.path) ? 'inherit' : 'text.secondary',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive(item.path) ? 600 : 500,
                    variant: 'body1'
                  }}
                />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Civic Engagement Platform
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Making government accessible through AI
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and brand */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                }}
              >
                KY
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="h6" fontWeight={600}>
                  Know Your Vote KY
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Kentucky Civic Engagement
                </Typography>
              </Box>
            </Box>
          </Link>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                component={Link}
                href={item.path}
                sx={{
                  color: 'text.primary',
                  fontWeight: isActive(item.path) ? 'bold' : 'normal',
                  bgcolor: isActive(item.path) ? 'action.selected' : 'transparent',
                }}
                startIcon={item.icon}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <Box sx={{ flexGrow: { xs: 0, md: 1 } }} />

          {/* Theme toggle */}
          <IconButton
            color="inherit"
            onClick={handleThemeMenuOpen}
            sx={{ ml: 1 }}
          >
            {/* Implement theme toggle logic here */}
            <Brightness7 />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        {drawer}
      </Drawer>

      {/* Theme menu */}
      <Menu
        anchorEl={themeMenuAnchor}
        open={Boolean(themeMenuAnchor)}
        onClose={handleThemeMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => handleThemeChange('light')}>
          <ListItemIcon>
            <Brightness7 fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Light" />
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('dark')}>
          <ListItemIcon>
            <Brightness4 fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Dark" />
        </MenuItem>
        <MenuItem onClick={() => handleThemeChange('system')}>
          <ListItemIcon>
            <SettingsBrightness fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="System" />
        </MenuItem>
      </Menu>
    </>
  );
}
