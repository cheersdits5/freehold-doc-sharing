import { Request } from 'express';

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

export interface LogEntry {
  level: keyof LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  userId?: string;
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Centralized Logger Class
 * Provides structured logging with correlation IDs and request context
 * Requirements: 2.4, 3.5, 5.4
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private createLogEntry(
    level: keyof LogLevel,
    message: string,
    metadata?: Record<string, any>,
    req?: Request,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: req?.headers['x-correlation-id'] as string || this.generateCorrelationId(),
      userId: (req as any)?.user?.id,
      method: req?.method,
      url: req?.originalUrl,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip || req?.connection?.remoteAddress,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    return entry;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private writeLog(entry: LogEntry): void {
    const logString = JSON.stringify(entry, null, this.isDevelopment ? 2 : 0);

    // In development, use colored console output
    if (this.isDevelopment) {
      const colors = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m',  // Yellow
        info: '\x1b[36m',  // Cyan
        debug: '\x1b[90m', // Gray
      };
      const reset = '\x1b[0m';
      const color = colors[entry.level] || colors.info;
      
      console.log(`${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`);
      if (entry.error) {
        console.error(`${color}Error:${reset}`, entry.error);
      }
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log(`${color}Metadata:${reset}`, entry.metadata);
      }
    } else {
      // In production, output structured JSON logs
      console.log(logString);
    }

    // In production, you would send logs to external service
    // Examples: Winston with transports, Datadog, CloudWatch, etc.
    this.sendToExternalService(entry);
  }

  private sendToExternalService(entry: LogEntry): void {
    // Placeholder for external logging service integration
    // In production, implement integration with:
    // - AWS CloudWatch
    // - Datadog
    // - Splunk
    // - ELK Stack
    // - etc.
    
    if (process.env.LOG_WEBHOOK_URL) {
      // Example: Send to webhook endpoint
      fetch(process.env.LOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(err => {
        console.error('Failed to send log to external service:', err);
      });
    }
  }

  error(message: string, error?: Error, req?: Request, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LOG_LEVELS.ERROR, message, metadata, req, error);
    this.writeLog(entry);
  }

  warn(message: string, req?: Request, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LOG_LEVELS.WARN, message, metadata, req);
    this.writeLog(entry);
  }

  info(message: string, req?: Request, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LOG_LEVELS.INFO, message, metadata, req);
    this.writeLog(entry);
  }

  debug(message: string, req?: Request, metadata?: Record<string, any>): void {
    if (this.isDevelopment) {
      const entry = this.createLogEntry(LOG_LEVELS.DEBUG, message, metadata, req);
      this.writeLog(entry);
    }
  }

  // Convenience method for logging API requests
  logRequest(req: Request, message?: string): void {
    this.info(message || 'API Request', req, {
      body: req.body,
      query: req.query,
      params: req.params,
    });
  }

  // Convenience method for logging API responses
  logResponse(req: Request, statusCode: number, message?: string): void {
    const level = statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    const entry = this.createLogEntry(level, message || 'API Response', { statusCode }, req);
    this.writeLog(entry);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export type { LogEntry };