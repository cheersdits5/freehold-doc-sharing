import { apiClient } from '../utils/apiClient';
import { UploadResponse, DocumentInfo, Category, FileFilters } from '../types/document';

export class FileService {
  static async uploadFile(
    file: File, 
    category: string, 
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoryId', category);
    if (description) {
      formData.append('description', description);
    }

    const response = await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  static async getDocuments(filters?: FileFilters): Promise<{
    documents: DocumentInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/files?${params.toString()}`);
    return response.data;
  }

  static async getDownloadUrl(fileId: string): Promise<string> {
    const response = await apiClient.get(`/files/${fileId}/download`);
    return response.data.downloadUrl;
  }

  static async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/categories');
    return response.data;
  }

  static validateFile(file: File): string | null {
    // File size limit: 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size exceeds 50MB limit';
    }

    // Allowed file types
    const allowedTypes = [
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

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, TXT, or image files.';
    }

    return null;
  }
}