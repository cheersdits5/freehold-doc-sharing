import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './database/connection';
import authRoutes from './routes/authRoutes';
import fileRoutes from './routes/fileRoutes';
import categoryRoutes from './routes/categoryRoutes';
import { 
  correlationIdMiddleware, 
  requestLoggingMiddleware, 
  errorHandler, 
  notFoundHandler 
} from './middleware/errorMiddleware';
import {
  sanitizeInput,
  corsConfig,
  generalRateLimit,
  validateRequestSize,
  additionalSecurityHeaders,
  validateRequest
} from './middleware/securityMiddleware';
import { logger } from './utils/logger';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced CORS configuration for production
app.use(cors({
  ...corsConfig,
  origin: [
    'https://main.amplifyapp.com',
    'https://*.amplifyapp.com',
    process.env.CORS_ORIGIN || 'http://localhost:3000'
  ]
}));

// Additional security headers
app.use(additionalSecurityHeaders);

// Request validation and sanitization
app.use(validateRequest);
app.use(validateRequestSize);
app.use(sanitizeInput);

// General rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Error handling middleware
app.use(correlationIdMiddleware);
app.use(requestLoggingMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/categories', categoryRoutes);

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database connection
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      logger.info('Database initialized successfully');
      dbInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize database', error as Error);
    }
  }
};

// Wrap the app with serverless-http
const handler = serverless(app, {
  request: async (request, event, context) => {
    await initDB();
  }
});

export { handler };