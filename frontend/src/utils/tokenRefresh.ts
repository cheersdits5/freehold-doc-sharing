import { authService } from '../services/authService';
import { tokenStorage } from './tokenStorage';

interface TokenRefreshOptions {
  onTokenRefreshed?: (token: string) => void;
  onRefreshFailed?: () => void;
}

class TokenRefreshManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  async refreshToken(options: TokenRefreshOptions = {}): Promise<string | null> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      try {
        return await this.refreshPromise;
      } catch {
        return null;
      }
    }

    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      options.onRefreshFailed?.();
      return null;
    }

    this.refreshPromise = this.performRefresh(refreshToken, options);

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      options.onRefreshFailed?.();
      return null;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(
    refreshToken: string,
    options: TokenRefreshOptions
  ): Promise<string> {
    const response = await authService.refreshToken(refreshToken);
    
    // Update stored tokens
    tokenStorage.setToken(response.token);
    tokenStorage.setRefreshToken(response.refreshToken);
    
    // Notify callback
    options.onTokenRefreshed?.(response.token);
    
    // Schedule next refresh
    this.scheduleTokenRefresh(options);
    
    return response.token;
  }

  scheduleTokenRefresh(options: TokenRefreshOptions = {}): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh for 50 minutes (assuming 1-hour token expiry)
    this.refreshTimer = setTimeout(() => {
      this.refreshToken(options);
    }, 50 * 60 * 1000); // 50 minutes
  }

  clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      // Decode JWT token to check expiration
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]!));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      // If we can't decode the token, consider it expired
      return true;
    }
  }
}

export const tokenRefreshManager = new TokenRefreshManager();