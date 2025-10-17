import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';
import { LoginCredentials } from '../types/auth';
import { ValidatedTextField, useValidation, validationRules, FormFeedback } from './FormValidation';
import { ButtonLoading } from './LoadingSpinner';
import { useFormSubmission } from '../hooks/useLoading';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const { showError, showSuccess } = useError();
  const { submitting, submitError, handleSubmit, clearStatus } = useFormSubmission();
  
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  // Validation hooks
  const emailValidation = useValidation({
    required: true,
    requiredMessage: 'Email is required',
    rules: [validationRules.email],
  });

  const passwordValidation = useValidation({
    required: true,
    requiredMessage: 'Password is required',
    rules: [validationRules.minLength(6)],
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearStatus();

    // Validate all fields
    const isEmailValid = emailValidation.validate(credentials.email);
    const isPasswordValid = passwordValidation.validate(credentials.password);

    if (!isEmailValid || !isPasswordValid) {
      showError('Please fix the validation errors before submitting');
      return;
    }

    await handleSubmit(async () => {
      await login(credentials);
      showSuccess('Login successful! Welcome back.');
      onSuccess?.();
    });
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setCredentials((prev: LoginCredentials) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="grey.100"
      px={{ xs: 2, sm: 3 }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 3, sm: 4 }, 
          maxWidth: 400, 
          width: '100%',
          mx: 'auto'
        }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Freehold Document Sharing
        </Typography>
        <Typography 
          variant="h6" 
          component="h2" 
          gutterBottom 
          align="center" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          Member Login
        </Typography>

        <FormFeedback 
          type="error" 
          message={submitError || ''} 
          show={!!submitError} 
        />

        <Box component="form" onSubmit={handleFormSubmit} noValidate role="form">
          <ValidatedTextField
            fullWidth
            label="Email"
            type="email"
            value={credentials.email}
            onChange={handleInputChange('email')}
            validation={emailValidation}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            showSuccess
            inputProps={{
              'aria-describedby': emailValidation.error ? 'email-error' : undefined,
            }}
          />

          <ValidatedTextField
            fullWidth
            label="Password"
            type="password"
            value={credentials.password}
            onChange={handleInputChange('password')}
            validation={passwordValidation}
            margin="normal"
            required
            autoComplete="current-password"
            inputProps={{
              'aria-describedby': passwordValidation.error ? 'password-error' : undefined,
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={submitting}
            aria-label={submitting ? 'Signing in...' : 'Sign in to your account'}
          >
            <ButtonLoading loading={submitting}>
              Sign In
            </ButtonLoading>
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}