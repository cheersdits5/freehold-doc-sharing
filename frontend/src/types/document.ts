export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string | undefined;
}

export interface UploadResponse {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  s3Key: string;
}

export interface FileValidationError {
  file: File;
  error: string;
}

export interface DocumentInfo {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  uploadedBy: string;
  uploadedAt: string;
  description?: string;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  documentCount: number;
}

export interface FileFilters {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}