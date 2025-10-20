import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { tokenStorage } from './tokenStorage';
import { tokenRefreshManager } from './tokenRefresh';
import { getErrorMessage } from '../contexts/ErrorContext';

const API_BASE_URL = 'https://wdjv9gq946.execute-api.eu-west-2.amazonaws.com/prod';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and error logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: any) => {
    const originalRequest = error.config;

    // Log API errors for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await tokenRefreshManager.refreshToken();
        
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Enhance error with user-friendly message
    error.userMessage = getErrorMessage(error);
    return Promise.reject(error);
  }
);

export { apiClient };