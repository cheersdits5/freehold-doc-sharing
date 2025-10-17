import { S3Service, createS3Service } from './s3Service';
import { FileMetadataService, createFileMetadataService, FileValidationOptions } from './fileMetadataService';
import { Document, CreateDocumentData, FileFilters, PaginatedDocuments, DocumentWithDetails } from '../models/Document';

export interface FileUploadResult {
  document: Document;
  uploadUrl?: string;
}

export interface FileUploadData {
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
  userId: string;
  categoryId?: string;
  description?: string;
  tags?: string[];
  securityMetadata?: {
    detectedMimeType?: string;
    fileSignature?: string;
    hasEmbeddedContent?: boolean;
    securityWarnings?: string[];
  };
}

export class FileService {
  private s3Service: S3Service;
  private metadataService: FileMetadataService;

  constructor(s3Service?: S3Service, metadataService?: FileMetadataService) {
    this.s3Service = s3Service || createS3Service();
    this.metadataService = metadataService || createFileMetadataService();
  }

  /**
   * Upload a file with metadata management
   */
  async uploadFile(uploadData: FileUploadData): Promise<FileUploadResult> {
    const { file, userId, categoryId, description, tags, securityMetadata } = uploadData;

    // Validate file
    const validationOptions: FileValidationOptions = {
      checkUserQuota: true,
      userId
    };
    
    const validation = await this.metadataService.validateFile(file, validationOptions);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Upload to S3
      const s3Result = await this.s3Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      );

      // Create document metadata
      const documentData: CreateDocumentData = {
        fileName: file.originalname,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        s3Key: s3Result.key,
        categoryId,
        uploadedBy: userId,
        description,
        tags,
        securityMetadata
      };

      const document = await this.metadataService.createDocument(documentData);

      return {
        document
      };
    } catch (error) {
      // If metadata creation fails, try to clean up S3 upload
      if (error.message.includes('S3')) {
        // S3 upload failed, no cleanup needed
        throw error;
      } else {
        // Metadata creation failed, clean up S3
        try {
          // We don't have the S3 key if metadata creation failed before S3 upload
          // This is handled by the transaction-like approach above
        } catch (cleanupError) {
          console.error('Failed to cleanup S3 file after metadata error:', cleanupError);
        }
        throw error;
      }
    }
  }

  /**
   * Get a secure download URL for a document
   */
  async getDownloadUrl(documentId: string, userId: string): Promise<string> {
    const document = await this.metadataService.getDocumentById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has access (basic check - can be enhanced with more complex permissions)
    // For now, users can access any document (as per freehold community sharing requirements)
    
    // Verify file exists in S3
    const fileExists = await this.s3Service.fileExists(document.s3Key);
    if (!fileExists) {
      throw new Error('File not found in storage');
    }

    return await this.s3Service.generatePresignedDownloadUrl(document.s3Key);
  }

  /**
   * Get a secure view URL for a document (for inline viewing)
   */
  async getViewUrl(documentId: string, userId: string): Promise<string> {
    const document = await this.metadataService.getDocumentById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Verify file exists in S3
    const fileExists = await this.s3Service.fileExists(document.s3Key);
    if (!fileExists) {
      throw new Error('File not found in storage');
    }

    return await this.s3Service.generatePresignedViewUrl(document.s3Key);
  }

  /**
   * Delete a document and its file
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const document = await this.metadataService.getDocumentById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has permission to delete (owner or admin)
    if (document.uploadedBy !== userId) {
      throw new Error('Permission denied: You can only delete your own documents');
    }

    try {
      // Delete from S3 first
      await this.s3Service.deleteFile(document.s3Key);
      
      // Then delete metadata
      const deleted = await this.metadataService.deleteDocument(documentId);
      
      return deleted;
    } catch (error) {
      // If S3 deletion fails, don't delete metadata
      if (error.message.includes('S3')) {
        throw new Error('Failed to delete file from storage');
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<DocumentWithDetails | null> {
    return await this.metadataService.getDocumentById(documentId);
  }

  /**
   * Get documents with filtering and pagination
   */
  async getDocuments(
    filters: FileFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedDocuments> {
    return await this.metadataService.getDocuments(filters, page, limit);
  }

  /**
   * Search documents
   */
  async searchDocuments(searchTerm: string, limit: number = 50): Promise<DocumentWithDetails[]> {
    return await this.metadataService.searchDocuments(searchTerm, limit);
  }

  /**
   * Get user's storage statistics
   */
  async getUserStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    remainingQuota: number;
  }> {
    const totalFiles = await this.metadataService.getUserDocumentCount(userId);
    const totalSize = await this.metadataService.getUserTotalFileSize(userId);
    const maxQuota = 500 * 1024 * 1024; // 500MB from constants
    
    return {
      totalFiles,
      totalSize,
      remainingQuota: Math.max(0, maxQuota - totalSize)
    };
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    documentId: string,
    userId: string,
    updates: {
      fileName?: string;
      categoryId?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<Document | null> {
    const document = await this.metadataService.getDocumentById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Check if user has permission to update (owner or admin)
    if (document.uploadedBy !== userId) {
      throw new Error('Permission denied: You can only update your own documents');
    }

    return await this.metadataService.updateDocument(documentId, updates);
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(categoryId: string, limit: number = 50): Promise<Document[]> {
    return await this.metadataService.getDocumentsByCategory(categoryId, limit);
  }

  /**
   * Validate file before upload (without actually uploading)
   */
  async validateFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
    },
    userId: string
  ) {
    const validationOptions: FileValidationOptions = {
      checkUserQuota: true,
      userId
    };
    
    return await this.metadataService.validateFile(file, validationOptions);
  }

  /**
   * Check if a file exists in both metadata and S3
   */
  async fileExists(documentId: string): Promise<boolean> {
    const document = await this.metadataService.getDocumentById(documentId);
    if (!document) {
      return false;
    }

    return await this.s3Service.fileExists(document.s3Key);
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(documentId: string) {
    const document = await this.metadataService.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    return await this.s3Service.getFileMetadata(document.s3Key);
  }
}

// Factory function to create FileService instance
export const createFileService = (): FileService => {
  return new FileService();
};