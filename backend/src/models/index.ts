// Export all models and types
// Requirements: 1.2, 2.6, 3.4 (data models)

// User models
export * from './User';

// Document models
export * from './Document';

// Category models
export * from './Category';

// Upload session models
export * from './UploadSession';

// Common types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}