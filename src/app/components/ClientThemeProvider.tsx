'use client';

import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '@/lib/theme';
import { useDarkMode } from '@/lib/useDarkMode';

export default function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useDarkMode();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
} 