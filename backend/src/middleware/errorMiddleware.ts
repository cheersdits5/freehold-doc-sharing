import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  status?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Custom Error Classes
 * Requirements: 2.4, 3.5, 5.4
 */
export class ValidationError extends Error implements AppError {
  status = 400;
  code = 'VALIDATION_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error implements AppError {
  status = 401;
  code = 'AUTHENTICATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error implements AppError {
  status = 403;
  code = 'AUTHORIZATION_ERROR';
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error implements AppError {
  status = 404;
  code = 'NOT_FOUND';
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  status = 409;
  code = 'CONFLICT_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class FileUploadError extends Error implements AppError {
  status = 413;
  code = 'FILE_UPLOAD_ERROR';
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class ExternalServiceError extends Error implements AppError {
  status = 502;
  code = 'EXTERNAL_SERVICE_ERROR';
  isOperational = true;

  constructor(message: string, public service?: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Correlation ID Middleware
 * Adds correlation ID to requests for tracking
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
}

/**
 * Request Logging Middleware
 * Logs incoming requests with correlation ID
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  logger.logRequest(req);

  // Log response when request completes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logResponse(req, res.statusCode, `Request completed in ${duration}ms`);
  });

  next();
}

/**
 * Global Error Handler Middleware
 * Centralized error handling with logging and user-friendly responses
 */
export function errorHandler(error: AppError, req: Request, res: Response, next: NextFunction): void {
  // Log the error
  logger.error('Request error occurred', error, req, {
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isOperational = error.isOperational || false;

  // Determine status code
  let statusCode = error.status || 500;
  let errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message;

  // Handle specific error types
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid input data';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (error.name === 'MulterError') {
    statusCode = 413;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (error.message.includes('File too large')) {
      message = 'File size exceeds the maximum limit';
    } else {
      message = 'File upload error';
    }
  }

  // Don't expose internal error details in production
  if (!isDevelopment && !isOperational) {
    message = 'Internal server error';
  }

  // Send error response
  const errorResponse = {
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      correlationId: req.headers['x-correlation-id'],
      ...(isDevelopment && { 
        stack: error.stack,
        details: error 
      }),
    },
  };

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Handler Middleware
 * Handles routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}