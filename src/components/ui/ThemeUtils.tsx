'use client';

import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material/styles';

/**
 * Hook that provides theme utility functions for consistent styling
 */
export const useThemeUtils = () => {
  const theme = useTheme();

  const isDark = theme.palette.mode === 'dark';

  /**
   * Get a color that adapts to the current theme mode
   */
  const getAdaptiveColor = (lightColor: string, darkColor: string) => {
    return isDark ? darkColor : lightColor;
  };

  /**
   * Get a background color that adapts to the current theme mode
   */
  const getAdaptiveBackground = (lightBg: string, darkBg: string) => {
    return isDark ? darkBg : lightBg;
  };

  /**
   * Get a border color that adapts to the current theme mode
   */
  const getAdaptiveBorder = (lightBorder: string, darkBorder: string) => {
    return isDark ? darkBorder : lightBorder;
  };

  /**
   * Get a shadow that adapts to the current theme mode
   */
  const getAdaptiveShadow = (lightShadow: string, darkShadow: string) => {
    return isDark ? darkShadow : lightShadow;
  };

  /**
   * Get a hover background color that adapts to the current theme mode
   */
  const getHoverBackground = () => {
    return isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  };

  /**
   * Get a focus ring color that adapts to the current theme mode
   */
  const getFocusRing = () => {
    return theme.palette.primary.main;
  };

  /**
   * Get a card background color
   */
  const getCardBackground = () => {
    return theme.palette.background.paper;
  };

  /**
   * Get a surface background color
   */
  const getSurfaceBackground = () => {
    return isDark ? 'rgba(255,255,255,0.05)' : theme.palette.background.paper;
  };

  /**
   * Get a divider color
   */
  const getDividerColor = () => {
    return theme.palette.divider;
  };

  /**
   * Get a skeleton color that adapts to the current theme mode
   */
  const getSkeletonColor = () => {
    // Force light mode skeleton color for now
    return 'rgba(0,0,0,0.1)';
  };

  /**
   * Get a text color based on importance
   */
  const getTextColor = (importance: 'primary' | 'secondary' | 'disabled' = 'primary') => {
    switch (importance) {
      case 'primary':
        return theme.palette.text.primary;
      case 'secondary':
        return theme.palette.text.secondary;
      case 'disabled':
        return theme.palette.text.disabled;
      default:
        return theme.palette.text.primary;
    }
  };

  /**
   * Get a semantic color (success, warning, error, info)
   */
  const getSemanticColor = (type: 'success' | 'warning' | 'error' | 'info') => {
    return theme.palette[type].main;
  };

  /**
   * Get a contrast text color for a given background color
   */
  const getContrastText = (backgroundColor: string) => {
    return theme.palette.getContrastText(backgroundColor);
  };

  /**
   * Get spacing value from theme
   */
  const getSpacing = (multiplier: number) => {
    return theme.spacing(multiplier);
  };

  /**
   * Get border radius from theme
   */
  const getBorderRadius = () => {
    return theme.shape.borderRadius;
  };

  return {
    theme,
    isDark,
    getAdaptiveColor,
    getAdaptiveBackground,
    getAdaptiveBorder,
    getAdaptiveShadow,
    getHoverBackground,
    getFocusRing,
    getCardBackground,
    getSurfaceBackground,
    getDividerColor,
    getSkeletonColor,
    getTextColor,
    getSemanticColor,
    getContrastText,
    getSpacing,
    getBorderRadius,
  };
};

/**
 * Component that provides theme-aware styling props
 */
export const ThemeAwareBox = ({ 
  children, 
  variant = 'card',
  ...props 
}: {
  children: React.ReactNode;
  variant?: 'card' | 'surface' | 'paper';
  [key: string]: any;
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const getCardBackground = () => {
    return theme.palette.background.paper;
  };

  const getSurfaceBackground = () => {
    return isDark ? 'rgba(255,255,255,0.05)' : theme.palette.background.paper;
  };

  const getAdaptiveShadow = (lightShadow: string, darkShadow: string) => {
    return isDark ? darkShadow : lightShadow;
  };

  const getBorderRadius = () => {
    return theme.shape.borderRadius;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return {
          backgroundColor: getCardBackground(),
          boxShadow: getAdaptiveShadow(
            '0 2px 8px rgba(0,0,0,0.08)',
            '0 2px 12px rgba(255,255,255,0.08)'
          ),
          borderRadius: getBorderRadius(),
        };
      case 'surface':
        return {
          backgroundColor: getSurfaceBackground(),
          borderRadius: getBorderRadius(),
        };
      case 'paper':
        return {
          backgroundColor: getCardBackground(),
          borderRadius: getBorderRadius(),
        };
      default:
        return {};
    }
  };

  return (
    <div style={{ ...getVariantStyles(), ...props }}>
      {children}
    </div>
  );
};

export default useThemeUtils; 