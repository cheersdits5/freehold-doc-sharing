import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tokenRefreshManager } from '../utils/tokenRefresh';

export function useAuthSession() {
  const { token, logout, isAuthenticated } = useAuth();

  const handleTokenRefreshed = useCallback((_newToken: string) => {
    // Token has been refreshed successfully
    console.log('Token refreshed successfully');
  }, []);

  const handleRefreshFailed = useCallback(() => {
    // Refresh failed, logout user
    console.log('Token refresh failed, logging out user');
    logout();
  }, [logout]);

  // Set up automatic token refresh when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      // Check if token is close to expiry and refresh if needed
      if (tokenRefreshManager.isTokenExpired(token)) {
        tokenRefreshManager.refreshToken({
          onTokenRefreshed: handleTokenRefreshed,
          onRefreshFailed: handleRefreshFailed,
        });
      } else {
        // Schedule automatic refresh
        tokenRefreshManager.scheduleTokenRefresh({
          onTokenRefreshed: handleTokenRefreshed,
          onRefreshFailed: handleRefreshFailed,
        });
      }
    }

    // Cleanup timer when component unmounts or user logs out
    return () => {
      if (!isAuthenticated) {
        tokenRefreshManager.clearRefreshTimer();
      }
    };
  }, [isAuthenticated, token, handleTokenRefreshed, handleRefreshFailed]);

  // Handle page visibility change to refresh token when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && token) {
        // Check if token needs refresh when user returns to the page
        if (tokenRefreshManager.isTokenExpired(token)) {
          tokenRefreshManager.refreshToken({
            onTokenRefreshed: handleTokenRefreshed,
            onRefreshFailed: handleRefreshFailed,
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, token, handleTokenRefreshed, handleRefreshFailed]);

  return {
    refreshToken: () => tokenRefreshManager.refreshToken({
      onTokenRefreshed: handleTokenRefreshed,
      onRefreshFailed: handleRefreshFailed,
    }),
  };
}