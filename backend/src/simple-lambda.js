// Simplified Lambda function for AWS deployment
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

// Environment configuration with defaults
const config = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  JWT_SECRET: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  API_VERSION: process.env.API_VERSION || 'v1'
};

// Logging utility
const log = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  error: (message, error = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack
    }));
  },
  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
};

const app = express();

// Enable CORS with comprehensive configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow Amplify domains
    if (origin.includes('amplifyapp.com')) return callback(null, true);
    
    // Allow custom domains (add your domain here)
    const allowedDomains = [
      'https://main.amplifyapp.com',
      'https://freehold-document-sharing.amplifyapp.com'
    ];
    
    if (allowedDomains.includes(origin)) {
      return callback(null, true);
    }
    
    // For production, you might want to be more restrictive
    return callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Api-Key',
    'X-Amz-Date',
    'X-Amz-Security-Token',
    'X-Amz-User-Agent'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request logging
app.use((req, res, next) => {
  log.info('Incoming request', {
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    contentType: req.headers['content-type']
  });
  next();
});

// Add response headers for API Gateway
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Api-Key, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Health check with environment info
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
    region: config.AWS_REGION,
    s3Configured: !!config.S3_BUCKET_NAME,
    corsOrigin: config.CORS_ORIGIN
  };
  
  log.info('Health check requested', healthData);
  res.json(healthData);
});

// Mock authentication endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    log.info('Login attempt', { email });
    
    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Simple mock authentication
    if (email === 'admin@freehold.com' && password === 'password123') {
      const tokenData = {
        token: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        expiresIn: config.JWT_EXPIRES_IN,
        user: {
          id: '1',
          email: email,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        }
      };
      
      log.info('Login successful', { email, userId: tokenData.user.id });
      res.json(tokenData);
    } else {
      log.warn('Login failed - invalid credentials', { email });
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    log.error('Login error', error);
    res.status(500).json({
      error: {
        code: 'LOGIN_ERROR',
        message: 'An error occurred during login',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Mock token validation
app.get('/api/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer mock-jwt-token')) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Mock categories endpoint
app.get('/api/categories', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json([
    {
      id: '1',
      name: 'Meeting Minutes',
      description: 'Board meeting minutes and agendas',
      documentCount: 5,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Financial Reports',
      description: 'Financial statements and budgets',
      documentCount: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Legal Documents',
      description: 'Contracts and legal paperwork',
      documentCount: 2,
      createdAt: new Date().toISOString()
    }
  ]);
});

// Mock files endpoint
app.get('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    documents: [
      {
        id: '1',
        originalName: 'sample-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        category: '1',
        description: 'Sample document for testing',
        tags: ['sample', 'test'],
        uploadedAt: new Date().toISOString()
      }
    ],
    total: 1,
    page: 1,
    totalPages: 1
  });
});

// Mock file upload
app.post('/api/files/upload', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json({
    id: 'mock-file-' + Date.now(),
    message: 'File uploaded successfully (mock)',
    fileName: 'uploaded-file.pdf'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  log.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      timestamp: new Date().toISOString()
    }
  });
});

// Catch all - 404 handler
app.use('*', (req, res) => {
  log.warn('Endpoint not found', {
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent']
  });
  
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
});

// Export for Lambda
module.exports.handler = serverless(app);