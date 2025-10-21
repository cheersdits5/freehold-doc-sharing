import { apiClient } from '../utils/apiClient';
import { UploadResponse, DocumentInfo, Category, FileFilters } from '../types/document';
import { uploadFileToS3, getStoredDocuments } from './s3Service';

export class FileService {
  static async uploadFile(
    file: File, 
    category: string, 
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResponse> {
    try {
      // Simulate progress for user feedback
      if (onProgress) {
        onProgress(10);
        setTimeout(() => onProgress(50), 500);
        setTimeout(() => onProgress(80), 1000);
      }

      // Use direct S3 upload (Aircraft Booking System approach)
      const document = await uploadFileToS3(file, description, category);
      
      if (onProgress) {
        onProgress(100);
      }

      return {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        uploadedAt: document.uploadedAt,
        s3Key: document.s3Key,
        // message: 'File uploaded successfully to S3!' // Removed - not in UploadResponse type
      };
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  static async getDocuments(filters?: FileFilters): Promise<{
    documents: DocumentInfo[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Get documents from localStorage (Aircraft Booking System approach)
      const storedDocs = getStoredDocuments();
      
      // Apply filters
      let filteredDocs = storedDocs;
      
      if (filters?.category) {
        filteredDocs = filteredDocs.filter(doc => doc.category === filters.category);
      }
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredDocs = filteredDocs.filter(doc => 
          doc.originalName.toLowerCase().includes(searchTerm) ||
          doc.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      // Convert to DocumentInfo format
      const documents: DocumentInfo[] = filteredDocs.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        originalName: doc.originalName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        category: doc.category,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
        description: doc.description || '',
        tags: doc.tags,
        downloadUrl: doc.s3Url
      }));
      
      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedDocs = documents.slice(startIndex, endIndex);
      
      return {
        documents: paginatedDocs,
        total: documents.length,
        page: page,
        totalPages: Math.ceil(documents.length / limit)
      };
    } catch (error) {
      console.error('Failed to get documents:', error);
      // Fallback to API if localStorage fails
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get(`/files?${params.toString()}`);
      return response.data;
    }
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