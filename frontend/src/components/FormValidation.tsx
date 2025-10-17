import React from 'react';
import { 
  TextField, 
  TextFieldProps,
  Alert,
  Box,
  Typography
} from '@mui/material';
import { CheckCircle, Error, Warning, Info } from '@mui/icons-material';

interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

interface UseValidationProps {
  rules?: ValidationRule[];
  required?: boolean;
  requiredMessage?: string;
}

interface UseValidationReturn {
  error: string | null;
  isValid: boolean;
  validate: (value: any) => boolean;
  reset: () => void;
}

/**
 * Custom hook for form field validation
 * Requirements: 2.4, 6.4
 */
export function useValidation({ 
  rules = [], 
  required = false, 
  requiredMessage = 'This field is required' 
}: UseValidationProps = {}): UseValidationReturn {
  const [error, setError] = React.useState<string | null>(null);

  const validate = React.useCallback((value: any): boolean => {
    // Check required validation
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      setError(requiredMessage);
      return false;
    }

    // Check custom rules
    for (const rule of rules) {
      if (!rule.validate(value)) {
        setError(rule.message);
        return false;
      }
    }

    setError(null);
    return true;
  }, [rules, required, requiredMessage]);

  const reset = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isValid: error === null,
    validate,
    reset,
  };
}

interface ValidatedTextFieldProps extends Omit<TextFieldProps, 'error' | 'helperText'> {
  validation?: UseValidationReturn;
  showSuccess?: boolean;
}

/**
 * Text Field with Validation
 * Requirements: 2.4, 6.4
 */
export function ValidatedTextField({ 
  validation, 
  showSuccess = false, 
  onChange,
  onBlur,
  ...props 
}: ValidatedTextFieldProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (validation) {
      validation.validate(value);
    }
    if (onChange) {
      onChange(event);
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (validation) {
      validation.validate(value);
    }
    if (onBlur) {
      onBlur(event);
    }
  };

  const hasError = validation?.error !== null;
  const isValid = validation?.isValid && showSuccess;

  return (
    <TextField
      {...props}
      error={hasError}
      helperText={validation?.error || props.helperText}
      onChange={handleChange}
      onBlur={handleBlur}
      InputProps={{
        ...props.InputProps,
        endAdornment: isValid ? (
          <CheckCircle color="success" sx={{ mr: 1 }} />
        ) : props.InputProps?.endAdornment,
      }}
    />
  );
}

interface FormFeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  show?: boolean;
}

/**
 * Form Feedback Component
 * Shows success, error, warning, or info messages
 * Requirements: 2.4, 6.4
 */
export function FormFeedback({ type, message, show = true }: FormFeedbackProps) {
  if (!show || !message) {
    return null;
  }

  const icons = {
    success: <CheckCircle />,
    error: <Error />,
    warning: <Warning />,
    info: <Info />,
  };

  return (
    <Alert 
      severity={type} 
      icon={icons[type]}
      sx={{ mb: 2 }}
    >
      {message}
    </Alert>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  error?: string | null;
  success?: string | null;
  children: React.ReactNode;
}

/**
 * Form Section with Title and Feedback
 * Requirements: 6.4
 */
export function FormSection({ title, description, error, success, children }: FormSectionProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {title && (
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
      )}

      <FormFeedback type="error" message={error || ''} show={!!error} />
      <FormFeedback type="success" message={success || ''} show={!!success} />

      {children}
    </Box>
  );
}

// Common validation rules
export const validationRules = {
  email: {
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Please enter a valid email address',
  },
  
  minLength: (min: number) => ({
    validate: (value: string) => value && value.length >= min,
    message: `Must be at least ${min} characters long`,
  }),
  
  maxLength: (max: number) => ({
    validate: (value: string) => !value || value.length <= max,
    message: `Must be no more than ${max} characters long`,
  }),
  
  password: {
    validate: (value: string) => value && value.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value),
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  },
  
  fileSize: (maxSizeMB: number) => ({
    validate: (file: File) => !file || file.size <= maxSizeMB * 1024 * 1024,
    message: `File size must be less than ${maxSizeMB}MB`,
  }),
  
  fileType: (allowedTypes: string[]) => ({
    validate: (file: File) => !file || allowedTypes.includes(file.type),
    message: `File type must be one of: ${allowedTypes.join(', ')}`,
  }),
};