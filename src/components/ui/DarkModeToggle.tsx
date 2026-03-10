'use client';

import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useDarkMode } from '@/lib/useDarkMode';

interface DarkModeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  className?: string;
  variant?: 'default' | 'nav' | 'minimal';
}

export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  size = 'medium', 
  showTooltip = true,
  className = '',
  variant = 'default'
}) => {
  const theme = useTheme();
  const { isDark, toggleDarkMode } = useDarkMode();

  const handleToggle = () => {
    toggleDarkMode();
  };

  const sizeClasses = {
    small: 'p-1.5',
    medium: 'p-2',
    large: 'p-3'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  // Variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'nav':
        return theme.palette.mode === 'dark'
          ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 focus:ring-white/20'
          : 'bg-black/5 border-black/10 text-black hover:bg-black/10 hover:border-black/20 focus:ring-black/20';
      case 'minimal':
        return 'bg-transparent border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-blue-600 dark:focus:ring-blue-400';
    }
  };

  // Icon color logic for nav variant
  const getIconClass = () => {
    if (variant === 'nav') {
      // Use theme-aware colors for nav variant
      return '';
    }
    return isDark ? 'text-yellow-500' : 'text-gray-700 dark:text-gray-300';
  };

  const toggle = (
    <button
      onClick={handleToggle}
      className={`dark-mode-toggle focus-visible ${className} ${sizeClasses[size]} rounded-md ${getVariantClasses()} focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      type="button"
    >
      {isDark ? (
        <svg 
          className={`toggle-icon ${iconSizes[size]} ${getIconClass()} transition-transform duration-200`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          style={variant === 'nav' ? { 
            color: theme.palette.mode === 'dark' 
              ? theme.palette.primary.contrastText 
              : theme.palette.text.primary 
          } : {}}
        >
          <path 
            fillRule="evenodd" 
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" 
            clipRule="evenodd" 
          />
        </svg>
      ) : (
        <svg 
          className={`toggle-icon ${iconSizes[size]} ${getIconClass()} transition-transform duration-200`}
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          style={variant === 'nav' ? { 
            color: theme.palette.mode === 'dark' 
              ? theme.palette.primary.contrastText 
              : theme.palette.text.primary 
          } : {}}
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </button>
  );

  if (showTooltip) {
    return (
      <div className="relative group">
        {toggle}
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap ${
          theme.palette.mode === 'dark' 
            ? 'text-white bg-gray-900' 
            : 'text-black bg-white border border-gray-200'
        }`}>
          {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
            theme.palette.mode === 'dark' 
              ? 'border-t-gray-900' 
              : 'border-t-white'
          }`}></div>
        </div>
      </div>
    );
  }

  return toggle;
};

export default DarkModeToggle; 