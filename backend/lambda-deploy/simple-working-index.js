// Simple working Lambda function for freehold-lambda
const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// Simple CORS - allow everything
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true
}));

// Parse JSON
app.use(express.json());

// Add CORS headers manually as backup
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    function: 'freehold-lambda',
    version: '1.0.0'
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@freehold.com' && password === 'password123') {
    res.json({
      token: 'mock-jwt-token-' + Date.now(),
      refreshToken: 'mock-refresh-token-' + Date.now(),
      user: {
        id: '1',
        email: email,
        firstName: 'Admin',
        lastName: 'User'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Categories endpoint
app.get('/api/categories', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.json([
    { id: '1', name: 'Meeting Minutes', description: 'Board meeting minutes and agendas', documentCount: 0 },
    { id: '2', name: 'Financial Reports', description: 'Financial statements and budgets', documentCount: 0 },
    { id: '3', name: 'Legal Documents', description: 'Contracts and legal paperwork', documentCount: 0 },
    { id: '4', name: 'General', description: 'General community documents', documentCount: 0 }
  ]);
});

// Files endpoint - simple version that works
app.get('/api/files', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Return empty list for now - no more sample document
  res.json({
    documents: [],
    total: 0,
    page: 1,
    totalPages: 0
  });
});

// Upload endpoint - simple version
app.post('/api/files/upload', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For now, just return success - we'll add S3 later
  res.json({
    id: 'file-' + Date.now(),
    message: 'File uploaded successfully (basic version)',
    fileName: 'uploaded-file.pdf'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/login',
      'GET /api/categories',
      'GET /api/files',
      'POST /api/files/upload'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

module.exports.handler = serverless(app);