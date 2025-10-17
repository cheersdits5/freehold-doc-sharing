import React from 'react';
import { 
  CircularProgress, 
  Box, 
  Typography, 
  Backdrop,
  LinearProgress,
  Skeleton
} from '@mui/material';

interface LoadingSpinnerProps {
  size?: number | string;
  color?: 'primary' | 'secondary' | 'inherit';
  message?: string;
  variant?: 'circular' | 'linear';
}

/**
 * Basic Loading Spinner Component
 * Requirements: 2.3, 2.4, 6.4
 */
export function LoadingSpinner({ 
  size = 40, 
  color = 'primary', 
  message,
  variant = 'circular' 
}: LoadingSpinnerProps) {
  if (variant === 'linear') {
    return (
      <Box sx={{ width: '100%', mb: 2 }}>
        <LinearProgress color={color} />
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      p={2}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}

interface FullScreenLoadingProps {
  open: boolean;
  message?: string;
}

/**
 * Full Screen Loading Overlay
 * Requirements: 2.3, 6.4
 */
export function FullScreenLoading({ open, message }: FullScreenLoadingProps) {
  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column'
      }}
      open={open}
    >
      <CircularProgress color="inherit" size={60} />
      {message && (
        <Typography variant="h6" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Backdrop>
  );
}

interface InlineLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  height?: number;
  lines?: number;
}

/**
 * Inline Loading with Skeleton
 * Shows skeleton while loading, content when loaded
 * Requirements: 6.4
 */
export function InlineLoading({ loading, children, height = 40, lines = 1 }: InlineLoadingProps) {
  if (loading) {
    return (
      <Box>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton 
            key={index}
            variant="rectangular" 
            height={height} 
            sx={{ mb: 1, borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return <>{children}</>;
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  size?: number;
}

/**
 * Button Loading Spinner
 * Small spinner for buttons
 * Requirements: 2.3, 6.4
 */
export function ButtonLoading({ loading, children, size = 20 }: ButtonLoadingProps) {
  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={size} color="inherit" />
        {children}
      </Box>
    );
  }

  return <>{children}</>;
}

interface ProgressWithLabelProps {
  value: number;
  label?: string;
}

/**
 * Progress Bar with Label
 * Used for file uploads and other progress tracking
 * Requirements: 2.3, 6.4
 */
export function ProgressWithLabel({ value, label }: ProgressWithLabelProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">
          {label || `${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
}