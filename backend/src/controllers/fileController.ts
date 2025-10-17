// File management controller
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { createFileService } from '../services/fileService';
import { createFileMetadataService } from '../services/fileMetadataService';
import { fileSecurityService } from '../services/fileSecurityService';
import { logger } from '../utils/logger';

export class FileController {
  private fileService = createFileService();
  private metadataService = createFileMetadataService();

  /**
   * Upload a file
   * POST /api/files/upload
   */
  async uploadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      if (!req.file) {
        res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No file provided',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { categoryId, description, tags } = req.body;
      
      // Parse tags if provided as string
      let parsedTags: string[] = [];
      if (tags) {
        try {
          parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (error) {
          parsedTags = typeof tags === 'string' ? [tags] : tags;
        }
      }

      // Enhanced file security validation
      const securityValidation = await fileSecurityService.validateFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      // Log the security validation attempt
      await fileSecurityService.logFileOperation({
        userId: req.user.userId,
        action: 'upload',
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        success: securityValidation.isValid,
        errorMessage: securityValidation.isValid ? undefined : securityValidation.errors.join(', '),
        metadata: {
          securityReport: fileSecurityService.generateSecurityReport(securityValidation, req.file.originalname),
          detectedMimeType: securityValidation.metadata.detectedMimeType,
          hasWarnings: securityValidation.warnings.length > 0
        }
      });

      // Reject file if security validation fails
      if (!securityValidation.isValid) {
        res.status(400).json({
          error: {
            code: 'FILE_SECURITY_VALIDATION_FAILED',
            message: 'File failed security validation',
            details: securityValidation.errors,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Log warnings if present
      if (securityValidation.warnings.length > 0) {
        logger.warn('File upload security warnings', undefined, req, {
          fileName: req.file.originalname,
          warnings: securityValidation.warnings,
          userId: req.user.userId
        });
      }

      const uploadData = {
        file: {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          buffer: req.file.buffer
        },
        userId: req.user.userId,
        categoryId: categoryId || undefined,
        description: description || undefined,
        tags: parsedTags,
        securityMetadata: {
          detectedMimeType: securityValidation.metadata.detectedMimeType,
          fileSignature: securityValidation.metadata.fileSignature,
          hasEmbeddedContent: securityValidation.metadata.hasEmbeddedContent,
          securityWarnings: securityValidation.warnings
        }
      };

      const result = await this.fileService.uploadFile(uploadData);

      res.status(201).json({
        success: true,
        data: {
          document: result.document,
          message: 'File uploaded successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('File upload error:', error);
      
      res.status(400).json({
        error: {
          code: 'UPLOAD_FAILED',
          message: error.message || 'Failed to upload file',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get list of documents with filtering and pagination
   * GET /api/files
   */
  async getDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const {
        page = '1',
        limit = '20',
        categoryId,
        search,
        mimeType,
        tags,
        dateFrom,
        dateTo
      } = req.query;

      const filters: any = {};
      
      if (categoryId) filters.categoryId = categoryId as string;
      if (search) filters.search = search as string;
      if (mimeType) filters.mimeType = mimeType as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      
      if (tags) {
        try {
          filters.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
        } catch (error) {
          filters.tags = typeof tags === 'string' ? [tags] : tags;
        }
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const result = await this.fileService.getDocuments(filters, pageNum, limitNum);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get documents error:', error);
      
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get a specific document by ID
   * GET /api/files/:id
   */
  async getDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { id } = req.params;
      const document = await this.fileService.getDocument(id);

      if (!document) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { document },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get document error:', error);
      
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch document',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Generate secure download URL for a document
   * GET /api/files/:id/download
   */
  async getDownloadUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { id } = req.params;
      
      // Get document details for audit logging
      const document = await this.metadataService.getDocumentById(id);
      if (!document) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const downloadUrl = await this.fileService.getDownloadUrl(id, req.user.userId);

      // Log download operation for audit trail
      await fileSecurityService.logFileOperation({
        userId: req.user.userId,
        action: 'download',
        fileId: id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        success: true
      });

      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          expiresIn: 900 // 15 minutes
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get download URL error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_URL_FAILED',
          message: error.message || 'Failed to generate download URL',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Generate secure view URL for a document (inline viewing)
   * GET /api/files/:id/view
   */
  async getViewUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { id } = req.params;
      const viewUrl = await this.fileService.getViewUrl(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          viewUrl,
          expiresIn: 900 // 15 minutes
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get view URL error:', error);
      
      const statusCode = error.message.includes('not found') ? 404 : 500;
      
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'DOCUMENT_NOT_FOUND' : 'VIEW_URL_FAILED',
          message: error.message || 'Failed to generate view URL',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Search documents
   * GET /api/files/search
   */
  async searchDocuments(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { q: searchTerm, limit = '50' } = req.query;

      if (!searchTerm) {
        res.status(400).json({
          error: {
            code: 'MISSING_SEARCH_TERM',
            message: 'Search term is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const limitNum = parseInt(limit as string, 10);
      const documents = await this.fileService.searchDocuments(searchTerm as string, limitNum);

      res.status(200).json({
        success: true,
        data: {
          documents,
          total: documents.length,
          searchTerm
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Search documents error:', error);
      
      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search documents',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update document metadata
   * PUT /api/files/:id
   */
  async updateDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { id } = req.params;
      const { fileName, categoryId, description, tags } = req.body;

      const updates: any = {};
      if (fileName) updates.fileName = fileName;
      if (categoryId) updates.categoryId = categoryId;
      if (description !== undefined) updates.description = description;
      if (tags) updates.tags = Array.isArray(tags) ? tags : [tags];

      const updatedDocument = await this.fileService.updateDocumentMetadata(
        id,
        req.user.userId,
        updates
      );

      if (!updatedDocument) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          document: updatedDocument,
          message: 'Document updated successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update document error:', error);
      
      const statusCode = error.message.includes('Permission denied') ? 403 : 500;
      
      res.status(statusCode).json({
        error: {
          code: statusCode === 403 ? 'PERMISSION_DENIED' : 'UPDATE_FAILED',
          message: error.message || 'Failed to update document',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete a document
   * DELETE /api/files/:id
   */
  async deleteDocument(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const { id } = req.params;
      
      // Get document details for audit logging before deletion
      const document = await this.metadataService.getDocumentById(id);
      if (!document) {
        res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const deleted = await this.fileService.deleteDocument(id, req.user.userId);

      // Log delete operation for audit trail
      await fileSecurityService.logFileOperation({
        userId: req.user.userId,
        action: 'delete',
        fileId: id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date(),
        success: deleted
      });

      if (!deleted) {
        res.status(500).json({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete document',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Document deleted successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete document error:', error);
      
      const statusCode = error.message.includes('Permission denied') ? 403 : 500;
      
      res.status(statusCode).json({
        error: {
          code: statusCode === 403 ? 'PERMISSION_DENIED' : 'DELETE_FAILED',
          message: error.message || 'Failed to delete document',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get user's storage statistics
   * GET /api/files/stats
   */
  async getStorageStats(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const stats = await this.fileService.getUserStorageStats(req.user.userId);

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get storage stats error:', error);
      
      res.status(500).json({
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to get storage statistics',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

// Export singleton instance
export const fileController = new FileController();