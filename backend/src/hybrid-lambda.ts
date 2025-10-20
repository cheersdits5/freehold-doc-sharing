import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'https://main.d2n7j8wrtqbawq.amplifyapp.com',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'freehold-documents-prod';

// In-memory storage for document metadata
let documents: any[] = [];
let categories = [
  { id: '1', name: 'Meeting Minutes', description: 'Board meeting minutes and agendas', documentCount: 0 },
  { id: '2', name: 'Financial Reports', description: 'Financial statements and budgets', documentCount: 0 },
  { id: '3', name: 'Legal Documents', description: 'Contracts and legal paperwork', documentCount: 0 },
  { id: '4', name: 'General', description: 'General community documents', documentCount: 0 }
];

// Auth middleware (simplified)
const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer mock-jwt-token')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { id: 'user1', firstName: 'Test', lastName: 'User' };
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Categories endpoint
app.get('/api/categories', authMiddleware, (req, res) => {
  res.json(categories);
});

// Files list endpoint
app.get('/api/files', authMiddleware, (req, res) => {
  const { page = 1, limit = 10, search, category } = req.query;
  
  let filteredDocs = [...documents];
  
  if (search) {
    filteredDocs = filteredDocs.filter(doc => 
      doc.originalName.toLowerCase().includes(search.toString().toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(search.toString().toLowerCase()))
    );
  }
  
  if (category) {
    filteredDocs = filteredDocs.filter(doc => doc.category === category);
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex);
  
  res.json({
    documents: paginatedDocs,
    total: filteredDocs.length,
    page: Number(page),
    totalPages: Math.ceil(filteredDocs.length / Number(limit))
  });
});

// File upload endpoint
app.post('/api/files/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { categoryId, description } = req.body;
    const fileId = uuidv4();
    const fileName = `${fileId}-${req.file.originalname}`;
    
    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user.id,
        categoryId: categoryId || '4' // Default to General
      }
    });

    await s3Client.send(uploadCommand);

    // Store metadata in memory
    const document = {
      id: fileId,
      fileName: fileName,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category: categoryId || '4',
      uploadedBy: req.user.id,
      uploadedAt: new Date().toISOString(),
      description: description || '',
      tags: []
    };

    documents.push(document);

    // Update category count
    const category = categories.find(cat => cat.id === document.category);
    if (category) {
      category.documentCount++;
    }

    res.json({
      id: fileId,
      fileName: fileName,
      fileSize: req.file.size,
      uploadedAt: document.uploadedAt,
      s3Key: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// File download endpoint
app.get('/api/files/:id/download', authMiddleware, async (req, res) => {
  try {
    const document = documents.find(doc => doc.id === req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'File not found' });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: document.fileName
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

export const handler = serverless(app);