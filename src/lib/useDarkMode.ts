import { useState, useEffect } from 'react';

export function useDarkMode() {
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      // 1. Try to read from <html data-theme>
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      if (htmlTheme === 'dark') return true;
      if (htmlTheme === 'light') return false;
      // 2. Fallback to localStorage
      const saved = localStorage.getItem('darkMode');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      // 3. Fallback to system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // SSR fallback
  };

  const [isDark, setIsDark] = useState(getInitialTheme);
  const [isSystem, setIsSystem] = useState(true);

  useEffect(() => {
    // Update <html> class and data-theme on change
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDark));
  }, [isDark]);

  const toggleDarkMode = () => {
    setIsDark((prev: boolean) => !prev);
    setIsSystem(false);
  };

  return { isDark, toggleDarkMode, isSystem };
} 