// Authentication controller for handling login endpoints
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5

import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { LoginCredentials } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class AuthController {
  /**
   * Handle user login
   * POST /api/auth/login
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginCredentials = req.body;

      // Validate request body
      if (!email || !password) {
        res.status(400).json({
          error: {
            code: 'MISSING_CREDENTIALS',
            message: 'Email and password are required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Attempt login
      const authResponse = await authService.login({ email, password });

      // Set secure HTTP-only cookie for refresh token
      res.cookie('refreshToken', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return user data and access token
      res.status(200).json({
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token
        }
      });
    } catch (error) {
      console.error('Login controller error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      const statusCode = errorMessage === 'Invalid credentials' ? 401 : 500;

      res.status(statusCode).json({
        error: {
          code: statusCode === 401 ? 'INVALID_CREDENTIALS' : 'AUTHENTICATION_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle token refresh
   * POST /api/auth/refresh
   */
  public async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'Refresh token not provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Refresh tokens
      const authResponse = await authService.refreshToken(refreshToken);

      // Set new refresh token cookie
      res.cookie('refreshToken', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return new access token
      res.status(200).json({
        success: true,
        data: {
          user: authResponse.user,
          token: authResponse.token
        }
      });
    } catch (error) {
      console.error('Token refresh controller error:', error);

      res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Handle user logout
   * POST /api/auth/logout
   */
  public async logout(req: Request, res: Response): Promise<void> {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout controller error:', error);

      res.status(500).json({
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Failed to logout',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get current user info
   * GET /api/auth/me
   */
  public async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Get fresh user data from token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Bearer token required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const token = authHeader.substring(7);
      const userInfo = await authService.getUserFromToken(token);

      res.status(200).json({
        success: true,
        data: {
          user: userInfo
        }
      });
    } catch (error) {
      console.error('Get current user controller error:', error);

      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Validate token endpoint (for middleware testing)
   * GET /api/auth/validate
   */
  public async validateToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          user: req.user
        }
      });
    } catch (error) {
      console.error('Token validation controller error:', error);

      res.status(500).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token validation failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

// Export singleton instance
export const authController = new AuthController();