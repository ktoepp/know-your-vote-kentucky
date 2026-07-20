'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { alpha, useTheme, type Theme, type SxProps } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Typography,
  Container,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
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
  KeyboardArrowDown as ExpandMoreIcon,
} from '@mui/icons-material';
import { KentuckyStateIcon } from '@/components/icons/KentuckyStateIcon';
import { useTooltips } from '@/lib/TooltipContext';
import { useUser } from "../lib/UserContext";
import { ICON_REM } from '@/lib/ui-tokens';

/** Served from `public/branding/` so deploys include it (`/branding/` is gitignored for source exports). */
const NAV_WORDMARK_SRC = '/branding/Logo-03.png';

type NavChildConfig = {
  href: string;
  label: string;
  icon: React.ReactElement<{ sx?: SxProps<Theme> }>;
  /** Opt out of viewport prefetch when the destination pulls heavy chunks (e.g. mapbox-gl). */
  prefetch?: false;
};

type NavLinkConfig = NavChildConfig & {
  priority: 'primary';
  /** Optional dropdown items shown under this link (e.g. Meetings under Committees). */
  children?: NavChildConfig[];
};

// Primary navigation links - Kentucky civic engagement.
// Order: Bills → Members → Committees (Meetings nested) → Find my legislators.
const navLinks: NavLinkConfig[] = [
  {
    href: '/bills',
    label: 'Bills',
    icon: <Description />,
    priority: 'primary',
  },
  {
    href: '/members',
    label: 'Members',
    icon: <Groups />,
    priority: 'primary',
  },
  {
    href: '/committees',
    label: 'Committees',
    icon: <Gavel />,
    priority: 'primary',
    children: [
      {
        href: '/meetings',
        label: 'Meetings',
        icon: <CalendarMonth />,
      },
    ],
  },
  {
    href: '/members/map',
    label: 'Find my legislators',
    icon: <KentuckyStateIcon />,
    priority: 'primary',
    prefetch: false,
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


/** Shared style for the desktop primary-nav buttons (Bills, Members, Find my legislators). */
function navButtonSx(active: boolean): SxProps<Theme> {
  return {
    color: active ? 'primary.main' : 'text.primary',
    backgroundColor: active ? 'rgba(0,0,0,0.06)' : 'transparent',
    borderRadius: 1.5,
    px: 2,
    py: 1,
    textTransform: 'none',
    fontSize: '0.9375rem',
    fontWeight: active ? 600 : 500,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
  };
}

/**
 * Committees primary-nav item: the label links straight to /committees, while an
 * adjacent caret opens a dropdown of nested destinations (Meetings). Opens on hover
 * or click; keyboard-accessible via the caret button (aria-haspopup + Escape/arrow keys).
 */
function CommitteesNavItem({ item }: { item: NavLinkConfig }) {
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);
  const open = Boolean(anchorEl);
  const children = item.children ?? [];
  const active = isNavPathActive(item.href, pathname) || children.some((c) => isNavPathActive(c.href, pathname));

  const openMenu = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (wrapRef.current) setAnchorEl(wrapRef.current);
  };
  const closeMenu = () => setAnchorEl(null);
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setAnchorEl(null), 120);
  };

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  return (
    <Box
      ref={wrapRef}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 1.5,
        backgroundColor: active ? 'rgba(0,0,0,0.06)' : 'transparent',
        '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
      }}
    >
      <Button
        component={Link}
        href={item.href}
        prefetch={item.prefetch}
        disableRipple
        sx={{
          color: active ? 'primary.main' : 'text.primary',
          backgroundColor: 'transparent',
          borderRadius: 1.5,
          pl: 2,
          pr: 0.75,
          py: 1,
          textTransform: 'none',
          fontSize: '0.9375rem',
          fontWeight: active ? 600 : 500,
          '&:hover': { backgroundColor: 'transparent' },
        }}
      >
        {item.label}
      </Button>
      <IconButton
        aria-label={`${item.label} submenu`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'committees-submenu' : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        size="small"
        sx={{
          color: active ? 'primary.main' : 'text.primary',
          mr: 0.5,
          p: 0.25,
          borderRadius: 1,
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.08)' },
        }}
      >
        <ExpandMoreIcon
          sx={{
            fontSize: '1.15rem',
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </IconButton>
      <Menu
        id="committees-submenu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        // pointer-events trick: let the transparent backdrop pass hover through to
        // the page so onMouseLeave still fires; the Paper re-enables interaction.
        sx={{ pointerEvents: 'none' }}
        MenuListProps={{
          'aria-label': item.label,
          onMouseEnter: openMenu,
          onMouseLeave: scheduleClose,
        }}
        PaperProps={{ elevation: 3, sx: { mt: 1, minWidth: 180, pointerEvents: 'auto' } }}
      >
        {children.map((child) => (
          <MenuItem
            key={child.href}
            component={Link}
            href={child.href}
            prefetch={child.prefetch}
            onClick={closeMenu}
            selected={isNavPathActive(child.href, pathname)}
            sx={{ gap: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {React.cloneElement(child.icon, { sx: { fontSize: '1.25rem' } })}
            </ListItemIcon>
            <ListItemText primary={child.label} />
          </MenuItem>
        ))}
      </Menu>
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
            {navLinks.map((item) =>
              item.children && item.children.length > 0 ? (
                <CommitteesNavItem key={item.href} item={item} />
              ) : (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  prefetch={item.prefetch}
                  sx={navButtonSx(isActive(item.href))}
                >
                  {item.label}
                </Button>
              ),
            )}
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right side items — order: Log in / Sign up → tooltip → search. */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* User menu (Log in / Sign up, or account avatar) */}
            <UserMenu />

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <IconButton
                onClick={toggleTooltips}
                aria-label={tooltipsEnabled ? 'Disable educational tooltips' : 'Enable educational tooltips'}
                aria-pressed={tooltipsEnabled}
                title={tooltipsEnabled ? 'Disable educational tooltips' : 'Enable educational tooltips'}
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
            </Box>

            {/* Desktop search icon. Native `title` replaces MuiTooltip so Popper
                stays out of the shell chunk; the icon-button's aria-label already
                covers assistive tech. */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              <IconButton
                component={Link}
                href="/search"
                aria-label="Search"
                title="Search bills and members"
                sx={{
                  color: theme.palette.text.primary,
                  p: 1.25,
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.05)' },
                }}
              >
                <SearchIcon sx={{ fontSize: ICON_REM.nav }} />
              </IconButton>
            </Box>

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
                <React.Fragment key={item.href}>
                  <ListItem sx={{ px: 2, py: 0 }}>
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      prefetch={item.prefetch}
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
                  {/* Nested items (e.g. Meetings under Committees) — indented sub-links. */}
                  {(item.children ?? []).map((child) => (
                    <ListItem key={child.href} sx={{ px: 2, py: 0 }}>
                      <ListItemButton
                        component={Link}
                        href={child.href}
                        prefetch={child.prefetch}
                        onClick={() => setMobileMenuOpen(false)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          ml: 2.5,
                          color: isActive(child.href) ? mobileNav.colorActive : mobileNav.color,
                          backgroundColor: isActive(child.href) ? mobileNav.activeBg : 'transparent',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                          {React.cloneElement(child.icon, { sx: { fontSize: '1.25rem' } })}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.label}
                          sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '1rem', color: 'inherit' } }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </React.Fragment>
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
