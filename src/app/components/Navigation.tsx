'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { alpha, useTheme, type Theme, type SxProps } from '@mui/material/styles';
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
  Tooltip as MuiTooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Description,
  Groups,
  AccountCircle,
  CalendarMonth,
  Gavel,
  Help as HelpIcon,
} from '@mui/icons-material';
import { KentuckyStateIcon } from '@/components/icons/KentuckyStateIcon';
import { useThemeUtils } from '@/components/ui/ThemeUtils';
import { useTooltips } from '@/lib/TooltipContext';
import { useUser } from "../lib/UserContext";
import { ICON_REM } from '@/lib/ui-tokens';
import { canonicalizeKyBillSearchInput } from '@/lib/ky-search-bills';

/** Served from `public/branding/` so deploys include it (`/branding/` is gitignored for source exports). */
const NAV_WORDMARK_SRC = '/branding/Logo-03.png';

type NavLinkConfig = {
  href: string;
  label: string;
  icon: React.ReactElement<{ sx?: SxProps<Theme> }>;
  priority: 'primary';
};

// Primary navigation links - Kentucky civic engagement
const navLinks: NavLinkConfig[] = [
  {
    href: '/bills',
    label: 'Bills',
    icon: <Description />,
    priority: 'primary',
  },
  {
    href: '/committees',
    label: 'Committees',
    icon: <Gavel />,
    priority: 'primary',
  },
  {
    href: '/meetings',
    label: 'Meetings',
    icon: <CalendarMonth />,
    priority: 'primary',
  },
  {
    href: '/members',
    label: 'Members',
    icon: <Groups />,
    priority: 'primary',
  },
  {
    href: '/members/map',
    label: 'Find my legislators',
    icon: <KentuckyStateIcon />,
    priority: 'primary',
  },
];

function isNavPathActive(path: string, pathname: string): boolean {
  if (path.includes('#')) {
    const basePath = path.split('#')[0];
    return pathname === basePath;
  }
  if (path === '/bills') {
    return pathname === '/bills' || pathname.startsWith('/bills/');
  }
  if (path === '/members/map') {
    return pathname === '/members/map' || pathname.startsWith('/members/map/');
  }
  if (path === '/members') {
    if (pathname.startsWith('/members/map')) return false;
    return pathname === '/members' || pathname.startsWith('/members/');
  }
  if (path === '/committees') {
    return pathname === '/committees' || pathname.startsWith('/committees/');
  }
  if (path === '/meetings') {
    return pathname === '/meetings' || pathname.startsWith('/meetings/');
  }
  return pathname === path;
}


const SEARCH_FIELD_SENTINEL = 'Search';

function GlobalSearchBar({ tone = 'default' }: { tone?: 'default' | 'onPrimary' }) {
  const theme = useTheme();
  const onPrimary = tone === 'onPrimary';
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(SEARCH_FIELD_SENTINEL);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname === '/search') {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      setValue(q || SEARCH_FIELD_SENTINEL);
    } else {
      setValue(SEARCH_FIELD_SENTINEL);
    }
  }, [pathname]);

  const hasRealQuery =
    value.trim() !== '' && value.trim() !== SEARCH_FIELD_SENTINEL;

  const submit = () => {
    const q = value.trim();
    if (!q || q === SEARCH_FIELD_SENTINEL) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(canonicalizeKyBillSearchInput(q))}`);
  };

  const inputColor = onPrimary
    ? value === SEARCH_FIELD_SENTINEL && !focused
      ? alpha(theme.palette.primary.contrastText, 0.75)
      : theme.palette.primary.contrastText
    : value === SEARCH_FIELD_SENTINEL && !focused
      ? theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.75)'
        : theme.palette.text.secondary
      : theme.palette.mode === 'dark'
        ? theme.palette.primary.contrastText
        : theme.palette.text.primary;

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      sx={{ width: { xs: '100%', md: 320 } }}
    >
      <TextField
        name="q"
        value={value}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          if (value === SEARCH_FIELD_SENTINEL) {
            requestAnimationFrame(() => e.target.select());
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (value.trim() === '') {
            setValue(SEARCH_FIELD_SENTINEL);
          }
        }}
        variant="outlined"
        size="small"
        fullWidth
        inputProps={{
          'aria-label': 'Search bills and members',
          title: 'Search bills (e.g. HB 23) or members by name',
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: onPrimary
              ? alpha(theme.palette.primary.contrastText, 0.12)
              : theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.15)'
                : 'rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            '& fieldset': {
              borderColor: onPrimary
                ? alpha(theme.palette.primary.contrastText, 0.35)
                : theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(0,0,0,0.2)',
            },
            '&:hover fieldset': {
              borderColor: onPrimary
                ? alpha(theme.palette.primary.contrastText, 0.55)
                : theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(0,0,0,0.3)',
            },
            '&.Mui-focused fieldset': {
              borderColor: onPrimary ? alpha(theme.palette.primary.contrastText, 0.95) : theme.palette.primary.main,
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '1rem',
            color: inputColor,
          },
        }}
        InputProps={{
          endAdornment: hasRealQuery ? (
            <InputAdornment position="end">
              <IconButton
                type="submit"
                size="small"
                edge="end"
                aria-label="Submit search"
                sx={{
                  color: onPrimary
                    ? theme.palette.primary.contrastText
                    : theme.palette.mode === 'dark'
                      ? theme.palette.primary.contrastText
                      : theme.palette.primary.main,
                }}
              >
                <SearchIcon sx={{ fontSize: ICON_REM.nav }} />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
      />
    </Box>
  );
}

function TooltipToggleMenuItem({ onClose }: { onClose?: () => void }) {
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  return (
    <MenuItem
      onClick={() => {
        toggleTooltips();
        onClose?.();
      }}
      sx={{ gap: 1 }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <HelpIcon fontSize="small" sx={{ opacity: tooltipsEnabled ? 1 : 0.5 }} aria-hidden />
      </ListItemIcon>
      <ListItemText
        primary={tooltipsEnabled ? 'Disable educational tooltips' : 'Enable educational tooltips'}
      />
    </MenuItem>
  );
}

// UserMenu component
function UserMenu() {
  const pathname = usePathname();
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
        <IconButton
          onClick={handleMenu}
          size="small"
          sx={{ ml: 1 }}
          aria-label="Open account menu"
          aria-haspopup="true"
          aria-expanded={open}
        >
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
          <Divider />
          <TooltipToggleMenuItem />
          <Divider />
          <MenuItem component={Link} href="/auth/logout">Logout</MenuItem>
        </Menu>
      </>
    );
  }
  const nextPath = pathname && !pathname.startsWith('/auth') ? pathname : '/';
  const loginHref = `/auth/login?next=${encodeURIComponent(nextPath)}`;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        component={Link}
        href={loginHref}
        variant="text"
        size="small"
        sx={{ whiteSpace: 'nowrap', color: 'text.primary', display: { xs: 'none', sm: 'inline-flex' } }}
      >
        Log in
      </Button>
      <Button
        component={Link}
        href="/auth/register"
        variant="contained"
        size="small"
        sx={{ whiteSpace: 'nowrap' }}
      >
        Sign up
      </Button>
    </Box>
  );
}

export default function Navigation() {
  const theme = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const { getHoverBackground } = useThemeUtils();
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  const { user, loading } = useUser();

  const isActive = (path: string) => isNavPathActive(path, pathname);

  /** Nav item colors for the light mobile drawer. */
  const mobileNav = {
    color: theme.palette.text.secondary,
    colorActive: theme.palette.primary.main,
    hover: theme.palette.action.hover,
    activeBg: alpha(theme.palette.primary.main, 0.08),
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
      color="inherit"
      sx={{
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : '#ffffff',
        color: 'text.primary',
        borderBottom: `1px solid ${theme.palette.divider}`,
        boxShadow: 'none',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
          {/* Logo / wordmark */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: { lg: 4 } }}>
            <Link href="/" style={{ textDecoration: 'none' }} aria-label="Know Your Vote Kentucky home">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  py: 0.75,
                  px: { xs: 0.75, sm: 1 },
                  borderRadius: 2,
                  '@media (prefers-reduced-motion: no-preference)': {
                    transition: 'transform 0.2s ease',
                  },
                  '&:hover': {
                    '@media (prefers-reduced-motion: no-preference)': {
                      transform: 'scale(1.02)',
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: 40, sm: 48 },
                    width: { xs: 200, sm: 280 },
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Image
                    src={NAV_WORDMARK_SRC}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 200px, 280px"
                    priority
                    style={{ objectFit: 'contain', objectPosition: 'left center' }}
                  />
                </Box>
              </Box>
            </Link>
          </Box>
          
          {/* Desktop Navigation Links */}
          <Box
            component="nav"
            aria-label="Primary"
            sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, alignItems: 'center' }}
          >
            {navLinks.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                sx={{
                  color: isActive(item.href) ? 'primary.main' : 'text.primary',
                  backgroundColor: isActive(item.href) ? 'rgba(0,0,0,0.06)' : 'transparent',
                  borderRadius: 1.5,
                  px: 2,
                  py: 1,
                  textTransform: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: isActive(item.href) ? 600 : 500,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          
          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Desktop search icon */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mx: 1 }}>
            <MuiTooltip title="Search bills and members" placement="bottom">
              <IconButton
                component={Link}
                href="/search"
                aria-label="Search"
                sx={{
                  color: theme.palette.text.primary,
                  p: 1.25,
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
                }}
              >
                <SearchIcon sx={{ fontSize: ICON_REM.nav }} />
              </IconButton>
            </MuiTooltip>
          </Box>

          {/* Right side items */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <MuiTooltip
                title={tooltipsEnabled ? 'Disable educational tooltips' : 'Enable educational tooltips'}
                placement="bottom"
              >
                <IconButton
                  onClick={toggleTooltips}
                  aria-label={tooltipsEnabled ? 'Disable educational tooltips' : 'Enable educational tooltips'}
                  aria-pressed={tooltipsEnabled}
                  sx={{
                    color: 'text.primary',
                    p: 1.25,
                    borderRadius: 2,
                    backgroundColor: tooltipsEnabled ? 'rgba(0,0,0,0.06)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)' },
                  }}
                >
                  <HelpIcon sx={{ fontSize: ICON_REM.nav, opacity: tooltipsEnabled ? 1 : 0.55 }} aria-hidden />
                </IconButton>
              </MuiTooltip>
            </Box>
            {/* User menu */}
            <UserMenu />

            {/* Mobile menu button */}
            <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
              <IconButton
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="site-primary-nav-mobile"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
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
          id="site-primary-nav-mobile"
          component="nav"
          aria-label="Primary"
          sx={{
            bgcolor: 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
            py: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <Container maxWidth="xl">
            <List sx={{ py: 0 }}>
              {navLinks.map((item) => (
                <ListItem key={item.href} sx={{ px: 2, py: 0 }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      color: isActive(item.href) ? mobileNav.colorActive : mobileNav.color,
                      backgroundColor: isActive(item.href) ? mobileNav.activeBg : 'transparent',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                    }}
                  >
                    <ListItemText
                      primary={item.label}
                      sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '1.125rem', color: 'inherit' } }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              <ListItem sx={{ px: 2, py: 0 }}>
                <ListItemButton
                  component={Link}
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    color: isActive('/search') ? mobileNav.colorActive : mobileNav.color,
                    backgroundColor: isActive('/search') ? mobileNav.activeBg : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    <SearchIcon aria-hidden />
                  </ListItemIcon>
                  <ListItemText
                    primary="Search"
                    sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '1.125rem', color: 'inherit' } }}
                  />
                </ListItemButton>
              </ListItem>
              <Divider sx={{ my: 1 }} />
              <ListItem sx={{ px: 2, py: 0 }}>
                <ListItemButton
                  onClick={() => {
                    toggleTooltips();
                    setMobileMenuOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    color: tooltipsEnabled ? mobileNav.colorActive : mobileNav.color,
                    backgroundColor: tooltipsEnabled ? mobileNav.activeBg : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    <HelpIcon aria-hidden />
                  </ListItemIcon>
                  <ListItemText
                    primary={tooltipsEnabled ? 'Disable tooltips' : 'Enable tooltips'}
                    sx={{
                      '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '1rem' },
                    }}
                  />
                </ListItemButton>
              </ListItem>
              {!loading && !user && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <ListItem sx={{ px: 2, py: 0 }}>
                    <ListItemButton
                      component={Link}
                      href={`/auth/login?next=${encodeURIComponent(pathname && !pathname.startsWith('/auth') ? pathname : '/')}`}
                      onClick={() => setMobileMenuOpen(false)}
                      sx={{
                        borderRadius: 2,
                        color: mobileNav.color,
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                      }}
                    >
                      <ListItemText
                        primary="Log in"
                        sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '1.125rem' } }}
                      />
                    </ListItemButton>
                  </ListItem>
                </>
              )}
            </List>
          </Container>
        </Box>
      </Collapse>
    </AppBar>
  );
} 