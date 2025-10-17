// Document model interface and types
// Requirements: 2.6 (file metadata), 3.4 (document organization)

export interface Document {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  categoryId?: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
  securityMetadata?: {
    detectedMimeType?: string;
    fileSignature?: string;
    hasEmbeddedContent?: boolean;
    securityWarnings?: string[];
    scanTimestamp?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentData {
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  categoryId?: string;
  uploadedBy: string;
  description?: string;
  tags?: string[];
  securityMetadata?: {
    detectedMimeType?: string;
    fileSignature?: string;
    hasEmbeddedContent?: boolean;
    securityWarnings?: string[];
  };
}

export interface UpdateDocumentData {
  fileName?: string;
  categoryId?: string;
  description?: string;
  tags?: string[];
}

export interface DocumentWithDetails extends Document {
  category?: {
    id: string;
    name: string;
  };
  uploader: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface FileFilters {
  categoryId?: string;
  uploadedBy?: string;
  mimeType?: string;
  tags?: string[];
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PaginatedDocuments {
  documents: DocumentWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Database row interface
export interface DocumentRow {
  id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  s3_key: string;
  category_id?: string;
  uploaded_by: string;
  description?: string;
  tags: string[];
  security_metadata?: any; // JSON field
  created_at: Date;
  updated_at: Date;
}

// Supported MIME types
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const;

export type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

// File size limits (in bytes)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_TOTAL_SIZE_PER_USER = 500 * 1024 * 1024; // 500MB per user