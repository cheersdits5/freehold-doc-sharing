// Services index - exports all service modules
// This file provides a centralized export point for all services

export { AuthService, createAuthService } from './authService';
export { S3Service, createS3Service } from './s3Service';
export { FileMetadataService, createFileMetadataService } from './fileMetadataService';
export { FileService, createFileService } from './fileService';
export { CategoryService, createCategoryService } from './categoryService';

// Re-export types for convenience
export type { S3UploadResult, S3ServiceConfig } from './s3Service';
export type { FileValidationResult, FileValidationOptions } from './fileMetadataService';
export type { FileUploadResult, FileUploadData } from './fileService';