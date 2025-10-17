import { useState, useCallback } from 'react';

interface UseLoadingReturn {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>;
}

/**
 * Custom hook for managing loading states
 * Requirements: 2.3, 2.4, 6.4
 */
export function useLoading(initialState = false): UseLoadingReturn {
  const [loading, setLoading] = useState(initialState);

  const withLoading = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading,
  };
}

interface UseAsyncOperationReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for managing async operations with loading, error, and data states
 * Requirements: 2.3, 2.4, 6.4
 */
export function useAsyncOperation<T>(
  asyncFn: (...args: any[]) => Promise<T>
): UseAsyncOperationReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn(...args);
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.userMessage || err?.message || 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

interface UseFormSubmissionReturn {
  submitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  handleSubmit: (submitFn: () => Promise<void>) => Promise<void>;
  clearStatus: () => void;
}

/**
 * Custom hook for managing form submission states
 * Requirements: 2.3, 2.4, 6.4
 */
export function useFormSubmission(): UseFormSubmissionReturn {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = useCallback(async (submitFn: () => Promise<void>) => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await submitFn();
      setSubmitSuccess(true);
    } catch (error: any) {
      const errorMessage = error?.userMessage || error?.message || 'Submission failed';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const clearStatus = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(false);
  }, []);

  return {
    submitting,
    submitError,
    submitSuccess,
    handleSubmit,
    clearStatus,
  };
}