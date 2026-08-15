'use client';

import React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { lightTheme } from '@/lib/theme';

// AppRouterCacheProvider streams Emotion's style tags into the SSR HTML so the
// initial client render sees the same class names. Without it, MUI inserts
// styles after hydration and React throws #418 (hydration mismatch).
export default function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
} 