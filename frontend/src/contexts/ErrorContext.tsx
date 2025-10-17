import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface ErrorContextType {
  showError: (message: string, severity?: AlertColor) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  clearError: () => void;
}

interface ErrorState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Global Error Context Provider
 * Provides centralized error handling and user notifications
 * Requirements: 2.4, 3.5, 6.4
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errorState, setErrorState] = useState<ErrorState>({
    open: false,
    message: '',
    severity: 'error',
  });

  const showError = useCallback((message: string, severity: AlertColor = 'error') => {
    setErrorState({
      open: true,
      message,
      severity,
    });

    // Log error for debugging
    console.error(`[${severity.toUpperCase()}]:`, message);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showError(message, 'success');
  }, [showError]);

  const showWarning = useCallback((message: string) => {
    showError(message, 'warning');
  }, [showError]);

  const showInfo = useCallback((message: string) => {
    showError(message, 'info');
  }, [showError]);

  const clearError = useCallback(() => {
    setErrorState(prev => ({ ...prev, open: false }));
  }, []);

  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    clearError();
  }, [clearError]);

  const contextValue: ErrorContextType = {
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearError,
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
      
      <Snackbar
        open={errorState.open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={errorState.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {errorState.message}
        </Alert>
      </Snackbar>
    </ErrorContext.Provider>
  );
}

/**
 * Hook to use error context
 */
export function useError(): ErrorContextType {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

/**
 * Utility function to get user-friendly error messages
 */
export function getErrorMessage(error: any): string {
  // Handle different error types
  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please log in and try again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 413:
        return 'The file is too large. Please choose a smaller file.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 503:
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return `An error occurred (${error.response.status}). Please try again.`;
    }
  }

  // Network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return 'Network connection failed. Please check your internet connection.';
  }

  // Timeout errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }

  // Default fallback
  return 'An unexpected error occurred. Please try again.';
}