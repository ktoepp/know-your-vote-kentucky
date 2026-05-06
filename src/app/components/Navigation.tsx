'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  Drawer,
  Tooltip as MuiTooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Home as HomeIcon,
  LiveTv as LiveTvIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Description,
  Groups,
  Timeline,
  Explore,
  Upload,
  Settings,
  Help as HelpIcon,
  AccountCircle,
  KeyboardArrowDown,
  EventNote,
} from '@mui/icons-material';
import { KentuckyStateIcon } from '@/components/icons/KentuckyStateIcon';
import { useThemeUtils } from '@/components/ui/ThemeUtils';
import { useTooltips } from '@/lib/TooltipContext';
import { useUser } from "../lib/UserContext";
import { ICON_REM, TYPE } from '@/lib/ui-tokens';
import { canonicalizeKyBillSearchInput } from '@/lib/ky-search-bills';

type NavSubLink = { href: string; label: string };

type NavLinkConfig = {
  href: string;
  label: string;
  icon: React.ReactElement<{ sx?: SxProps<Theme> }>;
  priority: 'primary';
  subLinks?: NavSubLink[];
};

// Primary navigation links - Kentucky civic engagement
const navLinks: NavLinkConfig[] = [
  {
    href: '/bills',
    label: 'Bills',
    icon: <Description />,
    priority: 'primary',
    subLinks: [
      { href: '/bills/senate', label: 'Senate' },
      { href: '/bills/house', label: 'House' },
    ],
  },
  {
    href: '/members',
    label: 'Members',
    icon: <Groups />,
    priority: 'primary',
  },
  {
    href: '/members/map',
    label: 'District map',
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
  return pathname === path;
}

function BillsNavDropdown({
  item,
  theme,
  pathname,
  getHoverBackground,
}: {
  item: NavLinkConfig;
  theme: Theme;
  pathname: string;
  getHoverBackground: () => string;
}) {
  const [billsAnchorEl, setBillsAnchorEl] = useState<null | HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMinWidth, setMenuMinWidth] = useState(240);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const openMenu = (anchor: HTMLElement) => {
    clearCloseTimer();
    setBillsAnchorEl(anchor);
    const w = anchor.offsetWidth;
    setMenuMinWidth(Math.max(240, w));
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 280);
  };

  useEffect(() => () => clearCloseTimer(), []);

  const groupActive = isNavPathActive(item.href, pathname);

  return (
    <Box
      onMouseEnter={(e) => openMenu(e.currentTarget)}
      onMouseLeave={scheduleCloseMenu}
      sx={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}
    >
      <Button
        component={Link}
        href={item.href}
        startIcon={React.cloneElement(item.icon, {
          sx: {
            fontSize: ICON_REM.nav,
            color: theme.palette.mode === 'dark'
              ? theme.palette.primary.contrastText
              : theme.palette.text.primary,
          },
        })}
        endIcon={
          <KeyboardArrowDown
            sx={{
              fontSize: ICON_REM.nav,
              opacity: 0.85,
              color: theme.palette.mode === 'dark'
                ? theme.palette.primary.contrastText
                : theme.palette.text.primary,
              transition: 'transform 0.2s ease',
              transform: menuOpen ? 'rotate(-180deg)' : 'none',
            }}
          />
        }
        aria-haspopup="true"
        aria-expanded={menuOpen}
        sx={{
          color: theme.palette.mode === 'dark'
            ? theme.palette.primary.contrastText
            : theme.palette.text.primary,
          backgroundColor: groupActive ? getHoverBackground() : 'transparent',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          textTransform: 'none',
          fontSize: '1.0625rem',
          fontWeight: groupActive ? 600 : 500,
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
        {item.label}
      </Button>
      <Menu
        anchorEl={billsAnchorEl}
        open={menuOpen && Boolean(billsAnchorEl)}
        onClose={() => setMenuOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableAutoFocus
        disableScrollLock
        sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
        MenuListProps={{
          autoFocus: false,
          sx: {
            py: 1.25,
            minWidth: menuMinWidth,
            bgcolor: 'background.paper',
          },
        }}
        PaperProps={{
          onMouseEnter: () => billsAnchorEl && openMenu(billsAnchorEl),
          onMouseLeave: scheduleCloseMenu,
          elevation: 8,
          sx: {
            mt: 0.75,
            minWidth: menuMinWidth,
            borderRadius: 2,
            overflow: 'visible',
            bgcolor: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {item.subLinks?.map((sub) => (
          <MenuItem
            key={sub.href}
            component={Link}
            href={sub.href}
            selected={pathname === sub.href}
            onClick={() => setMenuOpen(false)}
            sx={{
              py: 1.5,
              px: 2.25,
              minHeight: 52,
              fontSize: '1.0625rem',
              fontWeight: 500,
              color: 'text.primary',
              '&.Mui-selected': {
                bgcolor: 'action.selected',
              },
            }}
          >
            {sub.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
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
          'aria-label': 'Search',
          title: 'Search bills by designation (HB 23) or keywords',
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
                      : theme.palette.text.secondary,
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
                    variant={TYPE.sectionTitle.variant}
                    component="span"
                    sx={{
                      fontWeight: TYPE.sectionTitle.fontWeight,
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                      lineHeight: 1,
                    }}
                  >
                    Know Your Vote KY
                  </Typography>
                  <Typography
                    variant={TYPE.meta.variant}
                    sx={{
                      color: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(0,0,0,0.7)',
                      display: 'block',
                    }}
                  >
                    Kentucky Civic Engagement
                  </Typography>
                </Box>
              </Box>
            </Link>
          </Box>
          
          {/* Desktop Navigation Links */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, alignItems: 'center' }}>
            {navLinks.map((item) =>
              item.subLinks?.length ? (
                <BillsNavDropdown
                  key={item.href}
                  item={item}
                  theme={theme}
                  pathname={pathname}
                  getHoverBackground={getHoverBackground}
                />
              ) : (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  startIcon={React.cloneElement(item.icon, {
                    sx: {
                      fontSize: ICON_REM.nav,
                      color: theme.palette.mode === 'dark'
                        ? theme.palette.primary.contrastText
                        : theme.palette.text.primary,
                    },
                  })}
                  sx={{
                    color: theme.palette.mode === 'dark'
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.primary,
                    backgroundColor: isActive(item.href) ? getHoverBackground() : 'transparent',
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontSize: '1.0625rem',
                    fontWeight: isActive(item.href) ? 600 : 500,
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
                  {item.label}
                </Button>
              ),
            )}
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
                    fontSize: ICON_REM.nav,
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
            bgcolor: 'background.paper',
            borderTop: `1px solid ${theme.palette.divider}`,
            py: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <Container maxWidth="xl">
            <List sx={{ py: 0 }}>
              {navLinks.map((item) =>
                item.subLinks?.length ? (
                  <React.Fragment key={item.href}>
                    <ListItem sx={{ px: 2, py: 0 }}>
                      <ListItemButton
                        component={Link}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          color: isActive(item.href) ? mobileNav.colorActive : mobileNav.color,
                          backgroundColor: isActive(item.href) ? mobileNav.activeBg : 'transparent',
                          borderLeft: isActive(item.href)
                            ? `4px solid ${theme.palette.primary.main}`
                            : '4px solid transparent',
                          '&:hover': {
                            backgroundColor: mobileNav.hover,
                          },
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: 'inherit',
                            minWidth: 40,
                            '& .MuiSvgIcon-root': {
                              fontSize: ICON_REM.section,
                            },
                          }}
                        >
                          {React.cloneElement(item.icon, {
                            sx: {
                              fontSize: ICON_REM.section,
                              color: isActive(item.href) ? mobileNav.colorActive : mobileNav.color,
                            },
                          })}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontWeight: 600,
                              fontSize: '1.125rem',
                              color: 'inherit',
                            },
                          }}
                        />
                        {isActive(item.href) && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: theme.palette.primary.main,
                              ml: 'auto',
                            }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                    {item.subLinks.map((sub) => (
                      <ListItem key={sub.href} sx={{ px: 2, py: 0, pl: 5 }}>
                        <ListItemButton
                          component={Link}
                          href={sub.href}
                          onClick={() => setMobileMenuOpen(false)}
                          sx={{
                            borderRadius: 2,
                            mb: 0.5,
                            color: pathname === sub.href ? mobileNav.colorActive : mobileNav.color,
                            backgroundColor: pathname === sub.href ? mobileNav.activeBg : 'transparent',
                            borderLeft:
                              pathname === sub.href
                                ? `4px solid ${theme.palette.primary.main}`
                                : '4px solid transparent',
                            '&:hover': {
                              backgroundColor: mobileNav.hover,
                            },
                          }}
                        >
                          <ListItemText
                            primary={sub.label}
                            sx={{
                              '& .MuiListItemText-primary': {
                                fontWeight: 600,
                                fontSize: '1.0625rem',
                                color: 'inherit',
                              },
                            }}
                          />
                          {pathname === sub.href && (
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: theme.palette.primary.main,
                                ml: 'auto',
                              }}
                            />
                          )}
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </React.Fragment>
                ) : (
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
                        borderLeft: isActive(item.href)
                          ? `4px solid ${theme.palette.primary.main}`
                          : '4px solid transparent',
                        '&:hover': {
                          backgroundColor: mobileNav.hover,
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: 'inherit',
                          minWidth: 40,
                          '& .MuiSvgIcon-root': {
                            fontSize: ICON_REM.section,
                          },
                        }}
                      >
                        {React.cloneElement(item.icon, {
                          sx: {
                            fontSize: ICON_REM.section,
                            color: isActive(item.href) ? mobileNav.colorActive : mobileNav.color,
                          },
                        })}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontWeight: 600,
                            fontSize: '1.125rem',
                            color: 'inherit',
                          },
                        }}
                      />
                      {isActive(item.href) && (
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.primary.main,
                            ml: 'auto',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ),
              )}
            </List>
          </Container>
        </Box>
      </Collapse>
    </AppBar>
  );
} 