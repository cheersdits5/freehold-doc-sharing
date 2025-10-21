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
    log.info('CORS request from origin:', { origin });
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow all Amplify domains
    if (origin.includes('amplifyapp.com')) return callback(null, true);
    
    // Specifically allow your domain
    const allowedDomains = [
      'https://main.d2n7j8wrtqbawq.amplifyapp.com',
      'https://main.amplifyapp.com',
      'https://freehold-document-sharing.amplifyapp.com'
    ];
    
    if (allowedDomains.includes(origin)) {
      return callback(null, true);
    }
    
    // For debugging - allow all for now
    log.info('Allowing CORS for origin:', { origin });
    return callback(null, true);
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

// Real files endpoint with S3 integration
app.get('/api/files', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'eu-west-2' });
    const bucketName = process.env.S3_BUCKET_NAME || 'freehold-documents-prod-${aws:accountId}';
    
    try {
      const params = {
        Bucket: bucketName,
        Key: 'documents-metadata.json'
      };
      const result = await s3.getObject(params).promise();
      const documents = JSON.parse(result.Body.toString());
      
      log.info('Loaded documents from S3', { count: documents.length });
      
      res.json({
        documents: documents,
        total: documents.length,
        page: 1,
        totalPages: Math.ceil(documents.length / 10)
      });
    } catch (error) {
      // No documents file exists yet, return empty
      log.info('No documents metadata found, returning empty list');
      res.json({
        documents: [],
        total: 0,
        page: 1,
        totalPages: 0
      });
    }
  } catch (error) {
    log.error('Error loading documents', error);
    res.status(500).json({ error: 'Failed to load documents' });
  }
});

// Real file upload with S3 integration
app.post('/api/files/upload', async (req, res) => {
  log.info('Upload request received', { 
    headers: req.headers,
    contentType: req.headers['content-type'],
    origin: req.headers.origin
  });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    log.warn('Upload authentication failed', { authHeader });
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const multer = require('multer');
    const { v4: uuidv4 } = require('uuid');
    const AWS = require('aws-sdk');
    
    const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'eu-west-2' });
    const bucketName = process.env.S3_BUCKET_NAME || 'freehold-documents-prod-${aws:accountId}';
    
    // Configure multer for memory storage
    const upload = multer({ 
      storage: multer.memoryStorage(),
      limits: { fileSize: config.MAX_FILE_SIZE }
    });
    
    // Parse multipart form data
    upload.single('file')(req, res, async (err) => {
      if (err) {
        log.error('Multer error', err);
        return res.status(400).json({ error: 'File upload error: ' + err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      const fileId = uuidv4();
      const fileName = `${fileId}-${req.file.originalname}`;
      
      try {
        log.info('Starting file upload', { 
          fileName: req.file.originalname, 
          size: req.file.size,
          type: req.file.mimetype 
        });
        
        // Upload file to S3
        const uploadParams = {
          Bucket: bucketName,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          Metadata: {
            originalName: req.file.originalname,
            uploadedBy: 'user1',
            categoryId: req.body.categoryId || '4'
          }
        };
        
        await s3.upload(uploadParams).promise();
        log.info('File uploaded to S3 successfully', { fileName });
        
        // Load existing documents metadata
        let documents = [];
        try {
          const metadataParams = {
            Bucket: bucketName,
            Key: 'documents-metadata.json'
          };
          const result = await s3.getObject(metadataParams).promise();
          documents = JSON.parse(result.Body.toString());
          log.info('Loaded existing documents metadata', { count: documents.length });
        } catch (error) {
          log.info('No existing metadata found, starting fresh');
          documents = [];
        }
        
        // Add new document to metadata
        const document = {
          id: fileId,
          fileName: fileName,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          category: req.body.categoryId || '4',
          uploadedBy: 'user1',
          uploadedAt: new Date().toISOString(),
          description: req.body.description || '',
          tags: []
        };
        
        documents.push(document);
        log.info('Added document to metadata', { documentId: fileId, totalDocs: documents.length });
        
        // Save updated metadata to S3
        const saveParams = {
          Bucket: bucketName,
          Key: 'documents-metadata.json',
          Body: JSON.stringify(documents, null, 2),
          ContentType: 'application/json'
        };
        
        await s3.upload(saveParams).promise();
        log.info('Saved updated metadata to S3');
        
        res.json({
          id: fileId,
          fileName: fileName,
          fileSize: req.file.size,
          uploadedAt: document.uploadedAt,
          s3Key: fileName
        });
        
      } catch (error) {
        log.error('Upload processing error', error);
        res.status(500).json({ error: 'Upload failed: ' + error.message });
      }
    });
    
  } catch (error) {
    log.error('Upload setup error', error);
    res.status(500).json({ error: 'Upload setup failed: ' + error.message });
  }
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