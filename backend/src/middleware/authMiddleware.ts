// JWT authentication middleware for protected routes
// Requirements: 1.1, 1.4, 1.5, 5.3

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * JWT Authentication Middleware
 * Validates JWT token and adds user info to request object
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Check if token follows Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Token must be in Bearer format',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        error: {
          code: 'EMPTY_TOKEN',
          message: 'Token cannot be empty',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Validate token
    const validation = authService.validateToken(token);
    
    if (!validation.valid || !validation.payload) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: validation.error || 'Invalid token',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Verify user still exists and is active
    try {
      const userInfo = await authService.getUserFromToken(token);
      
      // Add user info to request object
      req.user = {
        userId: userInfo.id,
        email: userInfo.email,
        role: userInfo.role
      };

      next();
    } catch (error) {
      console.error('User verification error:', error);
      
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    res.status(500).json({
      error: {
        code: 'AUTH_MIDDLEWARE_ERROR',
        message: 'Authentication middleware failed',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export const requireRole = (requiredRole: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Admin role has access to everything
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        timestamp: new Date().toISOString()
      }
    });
  };
};

/**
 * Admin-only middleware
 * Shorthand for requireRole('admin')
 */
export const requireAdmin = requireRole('admin');

/**
 * Member or Admin middleware
 * Shorthand for requireRole(['member', 'admin'])
 */
export const requireMember = requireRole(['member', 'admin']);

/**
 * Optional authentication middleware
 * Adds user info to request if token is present and valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no token provided, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }

    // Try to validate token
    const validation = authService.validateToken(token);
    
    if (validation.valid && validation.payload) {
      try {
        const userInfo = await authService.getUserFromToken(token);
        
        req.user = {
          userId: userInfo.id,
          email: userInfo.email,
          role: userInfo.role
        };
      } catch (error) {
        // User not found or inactive, continue without user info
        console.warn('Optional auth - user not found:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail the request, just continue without user info
    next();
  }
};

/**
 * Session management middleware
 * Handles token refresh logic for near-expired tokens
 */
export const sessionMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const validation = authService.validateToken(token);
    
    if (validation.valid && validation.payload) {
      // Check if token expires within next 15 minutes
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = validation.payload.exp ? validation.payload.exp - now : 0;
      
      if (expiresIn > 0 && expiresIn < 900) { // 15 minutes
        // Token expires soon, suggest refresh
        res.setHeader('X-Token-Refresh-Suggested', 'true');
        res.setHeader('X-Token-Expires-In', expiresIn.toString());
      }
    }

    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    next();
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of attempts.entries()) {
      if (now > value.resetTime) {
        attempts.delete(key);
      }
    }
    
    const clientAttempts = attempts.get(clientId);
    
    if (!clientAttempts) {
      // First attempt
      attempts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (now > clientAttempts.resetTime) {
      // Window expired, reset
      attempts.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientAttempts.count >= maxAttempts) {
      // Rate limit exceeded
      const remainingTime = Math.ceil((clientAttempts.resetTime - now) / 1000);
      
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many authentication attempts. Try again in ${remainingTime} seconds.`,
          retryAfter: remainingTime,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    // Increment attempt count
    clientAttempts.count++;
    next();
  };
};