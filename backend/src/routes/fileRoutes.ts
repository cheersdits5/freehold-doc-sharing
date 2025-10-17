// File management routes
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.4, 3.5

import { Router } from 'express';
import multer from 'multer';
import { fileController } from '../controllers/fileController';
import { authMiddleware, sessionMiddleware } from '../middleware/authMiddleware';
import { validateFileUpload, validateFileUpdate } from '../middleware/validationMiddleware';
import { uploadRateLimit } from '../middleware/securityMiddleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(sessionMiddleware);

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file
 * @access  Private (authenticated users)
 */
router.post('/upload',
  uploadRateLimit, // Rate limit file uploads
  upload.single('file'),
  validateFileUpload,
  fileController.uploadFile.bind(fileController)
);

/**
 * @route   GET /api/files
 * @desc    Get list of documents with filtering and pagination
 * @access  Private (authenticated users)
 */
router.get('/',
  fileController.getDocuments.bind(fileController)
);

/**
 * @route   GET /api/files/search
 * @desc    Search documents
 * @access  Private (authenticated users)
 */
router.get('/search',
  fileController.searchDocuments.bind(fileController)
);

/**
 * @route   GET /api/files/stats
 * @desc    Get user's storage statistics
 * @access  Private (authenticated users)
 */
router.get('/stats',
  fileController.getStorageStats.bind(fileController)
);

/**
 * @route   GET /api/files/:id
 * @desc    Get a specific document by ID
 * @access  Private (authenticated users)
 */
router.get('/:id',
  fileController.getDocument.bind(fileController)
);

/**
 * @route   GET /api/files/:id/download
 * @desc    Generate secure download URL for a document
 * @access  Private (authenticated users)
 */
router.get('/:id/download',
  fileController.getDownloadUrl.bind(fileController)
);

/**
 * @route   GET /api/files/:id/view
 * @desc    Generate secure view URL for a document (inline viewing)
 * @access  Private (authenticated users)
 */
router.get('/:id/view',
  fileController.getViewUrl.bind(fileController)
);

/**
 * @route   PUT /api/files/:id
 * @desc    Update document metadata
 * @access  Private (authenticated users, document owner)
 */
router.put('/:id',
  validateFileUpdate,
  fileController.updateDocument.bind(fileController)
);

/**
 * @route   DELETE /api/files/:id
 * @desc    Delete a document
 * @access  Private (authenticated users, document owner)
 */
router.delete('/:id',
  fileController.deleteDocument.bind(fileController)
);

// Error handling middleware for multer errors
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 50MB limit',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file can be uploaded at a time',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  if (error.message && error.message.includes('File type')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  next(error);
});

export default router;