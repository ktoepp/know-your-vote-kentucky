'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TooltipContextType {
  tooltipsEnabled: boolean;
  toggleTooltips: () => void;
  setTooltipsEnabled: (enabled: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

export const useTooltips = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltips must be used within a TooltipProvider');
  }
  return context;
};

interface TooltipProviderProps {
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);

  // Load tooltip preference from localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem('tooltipsEnabled');
    if (savedPreference !== null) {
      setTooltipsEnabled(JSON.parse(savedPreference));
    }
  }, []);

  // Save tooltip preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('tooltipsEnabled', JSON.stringify(tooltipsEnabled));
  }, [tooltipsEnabled]);

  const toggleTooltips = () => {
    setTooltipsEnabled(prev => !prev);
  };

  const value: TooltipContextType = {
    tooltipsEnabled,
    toggleTooltips,
    setTooltipsEnabled,
  };

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  );
}; 