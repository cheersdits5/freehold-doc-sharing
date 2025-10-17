// Enhanced security middleware for input validation, XSS protection, and rate limiting
// Requirements: 5.3, 5.4

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Input sanitization middleware
 * Sanitizes request body, query, and params to prevent XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error', error as Error, req);
    res.status(400).json({
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Invalid input data format',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key name
      const cleanKey = sanitizeString(key);
      if (cleanKey !== key) {
        logger.warn('Sanitized object key', undefined, undefined, { original: key, sanitized: cleanKey });
      }
      
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize string input to prevent XSS attacks
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  // Remove or escape potentially dangerous characters
  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove potential script injections
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Limit length to prevent DoS
    .substring(0, 10000);
}

/**
 * Enhanced CORS configuration middleware
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Get allowed origins from environment
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim());

    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', undefined, undefined, { origin });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Correlation-ID',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Token-Refresh-Suggested',
    'X-Token-Expires-In'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

/**
 * General API rate limiting
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', undefined, req, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    logger.warn('Authentication rate limit exceeded', undefined, req, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email
    });
    
    res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * File upload rate limiting
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: {
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads, please try again later',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Upload rate limit exceeded', undefined, req, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.userId
    });
    
    res.status(429).json({
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Request size validation middleware
 */
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 60 * 1024 * 1024; // 60MB (slightly larger than file limit to account for multipart overhead)
    
    if (size > maxSize) {
      logger.warn('Request size too large', undefined, req, { size, maxSize });
      
      res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request size exceeds maximum allowed limit',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
  }
  
  next();
};

/**
 * Security headers middleware (additional to helmet)
 */
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
};

/**
 * Request validation middleware
 * Validates common request properties
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate User-Agent header (basic bot detection)
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10 || userAgent.length > 500) {
      logger.warn('Suspicious User-Agent', undefined, req, { userAgent });
    }
    
    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (contentType && !isValidContentType(contentType)) {
        res.status(400).json({
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Invalid or unsupported content type',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
    }
    
    // Validate request method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(req.method)) {
      res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'HTTP method not allowed',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Request validation error', error as Error, req);
    res.status(400).json({
      error: {
        code: 'REQUEST_VALIDATION_ERROR',
        message: 'Invalid request format',
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Check if content type is valid
 */
function isValidContentType(contentType: string): boolean {
  const validTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ];
  
  return validTypes.some(type => contentType.toLowerCase().includes(type));
}

/**
 * IP whitelist middleware (for admin endpoints if needed)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (allowedIPs.includes('*') || allowedIPs.includes(clientIP)) {
      next();
      return;
    }
    
    logger.warn('IP not whitelisted', undefined, req, { clientIP, allowedIPs });
    
    res.status(403).json({
      error: {
        code: 'IP_NOT_ALLOWED',
        message: 'Access denied from this IP address',
        timestamp: new Date().toISOString()
      }
    });
  };
};