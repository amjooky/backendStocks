import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import settingsService from '../services/settingsService';

interface CurrencyContextType {
  currency: string;
  formatCurrency: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const refreshCurrency = async (): Promise<void> => {
    // Only fetch currency if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    
    try {
      const settings = await settingsService.getSystemSettings();
      setCurrency(settings.currency || 'USD');
      // Clear the settings cache to ensure fresh data
      settingsService.clearCache();
    } catch (error) {
      console.error('Failed to refresh currency:', error);
    }
  };

  useEffect(() => {
    refreshCurrency();
  }, []);

  const value: CurrencyContextType = {
    currency,
    formatCurrency,
    refreshCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;