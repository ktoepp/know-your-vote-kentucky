'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Container,
  TextField,
  InputAdornment,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  useMediaQuery,
  Drawer,
  Tooltip as MuiTooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Home as HomeIcon,
  LiveTv as LiveTvIcon,
  Info as InfoIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  AccountTree,
  Description,
  Groups,
  Timeline,
  Explore,
  Upload,
  Settings,
  Help as HelpIcon,
  Event as EventIcon,
  AccountCircle,
} from '@mui/icons-material';
import { useThemeUtils } from '@/components/ui/ThemeUtils';
import { ThemedIcon } from '@/lib/icons';
import { useTooltips } from '@/lib/TooltipContext';
import { useUser } from "../lib/UserContext";

// Primary navigation links - Kentucky civic engagement
const primaryNavLinks = [
  { href: '/bills', label: 'Bills', icon: <Description />, priority: 'primary' },
  { href: '/ordinances', label: 'Ordinances', icon: <AccountTree />, priority: 'primary' },
  { href: '/events', label: 'Meetings', icon: <EventIcon />, priority: 'primary' },
  { href: '/members', label: 'Members', icon: <Groups />, priority: 'primary' },
  { href: '/search', label: 'Search', icon: <SearchIcon />, priority: 'primary' },
];

// Legacy navigation links (for backward compatibility)
const navLinks = primaryNavLinks;

function GlobalSearchBar() {
  const theme = useTheme();
  
  return (
    <TextField
      placeholder="Search Kentucky bills, ordinances, members..."
      variant="outlined"
      size="small"
      sx={{
        width: { xs: '100%', md: 320 },
        '& .MuiOutlinedInput-root': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255,255,255,0.15)' 
            : 'rgba(0,0,0,0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          '& fieldset': {
            borderColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.3)' 
              : 'rgba(0,0,0,0.2)',
          },
          '&:hover fieldset': {
            borderColor: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.5)' 
              : 'rgba(0,0,0,0.3)',
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
          },
        },
        '& .MuiInputBase-input': {
          color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.text.primary,
          '&::placeholder': {
            color: theme.palette.mode === 'dark' 
              ? 'rgba(255,255,255,0.8)' 
              : 'rgba(0,0,0,0.6)',
            opacity: 1,
          },
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <ThemedIcon icon={SearchIcon} />
          </InputAdornment>
        ),
      }}
    />
  );
}

// UserMenu component
function UserMenu() {
  const { user, loading } = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  if (loading) return null;
  if (user) {
    return (
      <>
        <IconButton onClick={handleMenu} size="small" sx={{ ml: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {user.email?.[0]?.toUpperCase() || <AccountCircle />}
          </Avatar>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onClick={handleClose}
          PaperProps={{
            elevation: 2,
            sx: { mt: 1.5, minWidth: 180 },
          }}
        >
          <Box px={2} py={1}>
            <Typography variant="subtitle2">{user.email}</Typography>
          </Box>
          <Divider />
          <MenuItem component={Link} href="/dashboard">Dashboard</MenuItem>
          <MenuItem component={Link} href="/profile">Profile</MenuItem>
          <MenuItem component={Link} href="/auth/logout">Logout</MenuItem>
        </Menu>
      </>
    );
  }
  return null;
}

export default function Navigation() {
  const theme = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const { getAdaptiveBackground, getAdaptiveBorder, getHoverBackground, getTextColor } = useThemeUtils();
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  const { user, loading } = useUser();

  const isActive = (path: string) => {
    // Handle anchor links by checking the base path
    if (path.includes('#')) {
      const basePath = path.split('#')[0];
      return pathname === basePath;
    }
    return pathname === path;
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    }
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [mobileMenuOpen]);

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        background: theme.palette.mode === 'dark' 
          ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 50%, ${theme.palette.primary.dark} 100%)`
          : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 50%, ${theme.palette.primary.light} 100%)`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: { lg: 4 } }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                p: 1,
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'rgba(0,0,0,0.05)',
                  transform: 'scale(1.02)',
                }
              }}>
                <Avatar sx={{ 
                  width: 48, 
                  height: 48,
                  background: theme.palette.mode === 'dark'
                    ? `linear-gradient(135deg, ${theme.palette.primary.contrastText} 0%, ${theme.palette.primary.light} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                  color: theme.palette.mode === 'dark' 
                    ? theme.palette.primary.main 
                    : theme.palette.primary.contrastText,
                  fontWeight: 'bold',
                  fontSize: '1.25rem',
                  boxShadow: 2,
                }}>
                  KY
                </Avatar>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="h5"
                    component="span"
                    sx={{
                      fontWeight: 'bold',
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                      lineHeight: 1,
                    }}
                  >
                    Know Your Vote KY
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(0,0,0,0.7)',
                      fontSize: '0.7rem',
                    }}
                  >
                    Kentucky Civic Engagement
                  </Typography>
                </Box>
              </Box>
            </Link>
          </Box>
          
          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1 }}>
            {navLinks.map(({ href, label, icon }) => (
              <Button
                key={href}
                component={Link}
                href={href}
                startIcon={React.cloneElement(icon, { 
                  sx: { 
                    color: theme.palette.mode === 'dark' 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.text.primary 
                  } 
                })}
                sx={{
                  color: theme.palette.mode === 'dark' 
                    ? theme.palette.primary.contrastText 
                    : theme.palette.text.primary,
                  backgroundColor: isActive(href) ? getHoverBackground() : 'transparent',
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: isActive(href) ? 600 : 500,
                  '&:hover': {
                    backgroundColor: getHoverBackground(),
                  },
                  '& .MuiButton-startIcon': {
                    transition: 'transform 0.2s ease',
                    color: theme.palette.mode === 'dark' 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.text.primary,
                  },
                  '&:hover .MuiButton-startIcon': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <Box sx={{ display: { xl: 'inline', lg: 'none' } }}>
                  {label}
                </Box>
                <Box sx={{ display: { xl: 'none', lg: 'inline' } }}>
                  {label}
                </Box>
              </Button>
            ))}
          </Box>
          
          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Desktop Search Bar */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, mx: 2 }}>
            <GlobalSearchBar />
          </Box>
          
          {/* Right side items */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Tooltip toggle - hidden on mobile */}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <MuiTooltip 
                title={tooltipsEnabled ? "Disable tooltips" : "Enable tooltips"}
                placement="bottom"
              >
                <IconButton
                  onClick={toggleTooltips}
                  sx={{
                    color: theme.palette.mode === 'dark' 
                      ? theme.palette.primary.contrastText 
                      : theme.palette.text.primary,
                    p: 1.5,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    backgroundColor: tooltipsEnabled 
                      ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                      : 'transparent',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255,255,255,0.2)' 
                        : 'rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  <HelpIcon sx={{ 
                    fontSize: '1.25rem',
                    opacity: tooltipsEnabled ? 1 : 0.6,
                  }} />
                </IconButton>
              </MuiTooltip>
            </Box>
            
            {/* User menu */}
            <UserMenu />
            
            {/* Mobile menu button */}
            <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                sx={{
                  color: theme.palette.mode === 'dark' 
                    ? theme.palette.primary.contrastText 
                    : theme.palette.text.primary,
                  p: 1.5,
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(0,0,0,0.05)',
                  },
                }}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </Container>
      
      {/* Mobile menu */}
      <Collapse in={mobileMenuOpen} timeout={300}>
        <Box
          ref={mobileMenuRef}
          sx={{
            background: theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
            backdropFilter: 'blur(10px)',
            borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            py: 2,
          }}
        >
          <Container maxWidth="xl">
            <List sx={{ py: 0 }}>
              {navLinks.map(({ href, label, icon }) => (
                <ListItem key={href} sx={{ px: 2, py: 0 }}>
                  <ListItemButton
                    component={Link}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      color: isActive(href) 
                        ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : '#ffffff')
                        : getTextColor('secondary'),
                      backgroundColor: isActive(href) ? getHoverBackground() : 'transparent',
                      borderLeft: isActive(href) 
                        ? (theme.palette.mode === 'dark' ? '4px solid #ffffff' : '4px solid #ffffff')
                        : '4px solid transparent',
                      '&:hover': {
                        backgroundColor: isActive(href) ? getHoverBackground() : getHoverBackground(),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ 
                      color: 'inherit',
                      minWidth: 40,
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.5rem',
                      },
                    }}>
                      {React.cloneElement(icon, { 
                        sx: { 
                          color: isActive(href) 
                            ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : '#ffffff')
                            : getTextColor('secondary')
                        } 
                      })}
                    </ListItemIcon>
                    <ListItemText 
                      primary={label} 
                      sx={{ 
                        '& .MuiListItemText-primary': {
                          fontWeight: 600,
                          fontSize: '1rem',
                        },
                      }}
                    />
                    {isActive(href) && (
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.primary.contrastText 
                          : '#ffffff',
                        ml: 'auto',
                      }} />
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            
            {/* Mobile Search Bar */}
            <Divider sx={{ 
              my: 2, 
              borderColor: theme.palette.mode === 'dark' 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(0,0,0,0.1)' 
            }} />
            <Box sx={{ px: 2, pb: 2 }}>
              <GlobalSearchBar />
            </Box>
            
            {/* Mobile Tooltip Toggle */}
            <Box sx={{ px: 2, pb: 1 }}>
              <Button
                onClick={toggleTooltips}
                startIcon={<HelpIcon />}
                fullWidth
                sx={{
                  justifyContent: 'flex-start',
                  color: tooltipsEnabled 
                    ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : '#ffffff')
                    : getTextColor('secondary'),
                  backgroundColor: tooltipsEnabled ? getHoverBackground() : 'transparent',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: getHoverBackground(),
                  },
                }}
              >
                {tooltipsEnabled ? 'Disable Tooltips' : 'Enable Tooltips'}
              </Button>
            </Box>
          </Container>
        </Box>
      </Collapse>
    </AppBar>
  );
} 