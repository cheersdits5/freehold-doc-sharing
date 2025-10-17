import { 
  Document, 
  CreateDocumentData, 
  UpdateDocumentData, 
  DocumentWithDetails, 
  FileFilters, 
  PaginatedDocuments,
  DocumentRow,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE_PER_USER,
  SupportedMimeType
} from '../models/Document';
import { BaseRepository, QueryBuilder, dbUtils } from '../database/queries';
import { db } from '../database/connection';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  checkUserQuota?: boolean;
  userId?: string;
}

export class FileMetadataService extends BaseRepository {
  constructor() {
    super('documents');
  }

  /**
   * Validate file before upload
   */
  async validateFile(
    file: {
      originalname: string;
      mimetype: string;
      size: number;
    },
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const {
      maxFileSize = MAX_FILE_SIZE,
      allowedMimeTypes = SUPPORTED_MIME_TYPES,
      checkUserQuota = true,
      userId
    } = options;

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      errors.push(`File size exceeds maximum limit of ${maxSizeMB}MB`);
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type '${file.mimetype}' is not supported`);
    }

    // Check file extension matches MIME type
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!this.isValidFileExtension(fileExtension, file.mimetype)) {
      errors.push('File extension does not match file type');
    }

    // Check filename
    if (!file.originalname || file.originalname.trim().length === 0) {
      errors.push('File name is required');
    }

    // Check for potentially dangerous file names
    if (this.isDangerousFileName(file.originalname)) {
      errors.push('File name contains invalid characters');
    }

    // Check user quota if requested
    if (checkUserQuota && userId) {
      const userTotalSize = await this.getUserTotalFileSize(userId);
      if (userTotalSize + file.size > MAX_TOTAL_SIZE_PER_USER) {
        const maxTotalSizeMB = Math.round(MAX_TOTAL_SIZE_PER_USER / (1024 * 1024));
        errors.push(`Upload would exceed user storage limit of ${maxTotalSizeMB}MB`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new document record
   */
  async createDocument(data: CreateDocumentData): Promise<Document> {
    const securityMetadata = data.securityMetadata ? {
      ...data.securityMetadata,
      scanTimestamp: new Date()
    } : null;

    const documentData = {
      id: dbUtils.generateId(),
      file_name: data.fileName,
      original_name: data.originalName,
      file_size: data.fileSize,
      mime_type: data.mimeType,
      s3_key: data.s3Key,
      category_id: data.categoryId || null,
      uploaded_by: data.uploadedBy,
      description: data.description || null,
      tags: data.tags || [],
      security_metadata: securityMetadata,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await this.insert<DocumentRow>(documentData);
    return this.mapRowToDocument(result);
  }

  /**
   * Get document by ID with details
   */
  async getDocumentById(id: string): Promise<DocumentWithDetails | null> {
    const query = `
      SELECT 
        d.*,
        c.id as category_id,
        c.name as category_name,
        u.id as uploader_id,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.id = $1
    `;

    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocumentWithDetails(result.rows[0]);
  }

  /**
   * Get documents with filtering and pagination
   */
  async getDocuments(
    filters: FileFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedDocuments> {
    const offset = (page - 1) * limit;
    
    const queryBuilder = new QueryBuilder()
      .select(`
        d.*,
        c.id as category_id,
        c.name as category_name,
        u.id as uploader_id,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name
      `)
      .from('documents d')
      .leftJoin('categories c', 'd.category_id = c.id')
      .leftJoin('users u', 'd.uploaded_by = u.id');

    // Apply filters
    if (filters.categoryId) {
      queryBuilder.where('d.category_id = ?', filters.categoryId);
    }

    if (filters.uploadedBy) {
      queryBuilder.where('d.uploaded_by = ?', filters.uploadedBy);
    }

    if (filters.mimeType) {
      queryBuilder.where('d.mime_type = ?', filters.mimeType);
    }

    if (filters.search) {
      queryBuilder.where(
        '(d.original_name ILIKE ? OR d.description ILIKE ?)',
        `%${filters.search}%`
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.where('d.tags && ?', filters.tags);
    }

    if (filters.dateFrom) {
      queryBuilder.where('d.created_at >= ?', filters.dateFrom);
    }

    if (filters.dateTo) {
      queryBuilder.where('d.created_at <= ?', filters.dateTo);
    }

    // Get total count
    const countQuery = queryBuilder.select('COUNT(*) as count').build();
    const countResult = await db.query<{ count: string }>(countQuery.query, countQuery.parameters);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const documentsQuery = queryBuilder
      .select(`
        d.*,
        c.id as category_id,
        c.name as category_name,
        u.id as uploader_id,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name
      `)
      .orderBy('d.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .build();

    const documentsResult = await db.query(documentsQuery.query, documentsQuery.parameters);
    const documents = documentsResult.rows.map(row => this.mapRowToDocumentWithDetails(row));

    return {
      documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update document metadata
   */
  async updateDocument(id: string, data: UpdateDocumentData): Promise<Document | null> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.fileName) updateData.file_name = data.fileName;
    if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const result = await this.updateById<DocumentRow>(id, updateData);
    return result ? this.mapRowToDocument(result) : null;
  }

  /**
   * Delete document record
   */
  async deleteDocument(id: string): Promise<boolean> {
    return await this.deleteById(id);
  }

  /**
   * Get user's total file size
   */
  async getUserTotalFileSize(userId: string): Promise<number> {
    const query = 'SELECT COALESCE(SUM(file_size), 0) as total_size FROM documents WHERE uploaded_by = $1';
    const result = await db.query<{ total_size: string }>(query, [userId]);
    return parseInt(result.rows[0].total_size);
  }

  /**
   * Get user's document count
   */
  async getUserDocumentCount(userId: string): Promise<number> {
    return await this.countWhere({ uploaded_by: userId });
  }

  /**
   * Check if document exists by S3 key
   */
  async getDocumentByS3Key(s3Key: string): Promise<Document | null> {
    const result = await this.findWhere<DocumentRow>({ s3_key: s3Key });
    return result.length > 0 ? this.mapRowToDocument(result[0]) : null;
  }

  /**
   * Get documents by category
   */
  async getDocumentsByCategory(categoryId: string, limit: number = 50): Promise<Document[]> {
    const result = await this.findWhere<DocumentRow>(
      { category_id: categoryId },
      'created_at DESC',
      limit
    );
    return result.map(row => this.mapRowToDocument(row));
  }

  /**
   * Search documents by text
   */
  async searchDocuments(searchTerm: string, limit: number = 50): Promise<DocumentWithDetails[]> {
    const query = `
      SELECT 
        d.*,
        c.id as category_id,
        c.name as category_name,
        u.id as uploader_id,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name,
        ts_rank(to_tsvector('english', d.original_name || ' ' || COALESCE(d.description, '')), plainto_tsquery('english', $1)) as rank
      FROM documents d
      LEFT JOIN categories c ON d.category_id = c.id
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE to_tsvector('english', d.original_name || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, d.created_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [searchTerm, limit]);
    return result.rows.map(row => this.mapRowToDocumentWithDetails(row));
  }

  // Private helper methods

  private isValidFileExtension(extension: string | undefined, mimeType: string): boolean {
    if (!extension) return false;

    const validExtensions: Record<string, string[]> = {
      'application/pdf': ['pdf'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'text/plain': ['txt'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx']
    };

    const allowedExtensions = validExtensions[mimeType];
    return allowedExtensions ? allowedExtensions.includes(extension) : false;
  }

  private isDangerousFileName(filename: string): boolean {
    // Check for dangerous characters and patterns
    const dangerousPatterns = [
      /[<>:"|?*]/,  // Windows reserved characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
      /^\./,  // Hidden files
      /\.\./,  // Directory traversal
      /[\x00-\x1f]/,  // Control characters
    ];

    return dangerousPatterns.some(pattern => pattern.test(filename));
  }

  private mapRowToDocument(row: DocumentRow): Document {
    return {
      id: row.id,
      fileName: row.file_name,
      originalName: row.original_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      s3Key: row.s3_key,
      categoryId: row.category_id,
      uploadedBy: row.uploaded_by,
      description: row.description,
      tags: row.tags,
      securityMetadata: row.security_metadata || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToDocumentWithDetails(row: any): DocumentWithDetails {
    const document = this.mapRowToDocument(row);
    
    return {
      ...document,
      category: row.category_id ? {
        id: row.category_id,
        name: row.category_name
      } : undefined,
      uploader: {
        id: row.uploader_id,
        firstName: row.uploader_first_name,
        lastName: row.uploader_last_name
      }
    };
  }
}

// Factory function to create FileMetadataService instance
export const createFileMetadataService = (): FileMetadataService => {
  return new FileMetadataService();
};