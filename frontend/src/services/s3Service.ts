/**
 * Direct S3 Upload Service - Based on Aircraft Booking System Architecture
 * Uploads files directly to S3 from frontend, bypassing Lambda complexity
 */

import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// AWS Configuration
const AWS_REGION = import.meta.env['VITE_AWS_REGION'] || 'eu-west-2';
const S3_BUCKET = import.meta.env['VITE_AWS_S3_BUCKET'] || 'freehold-documents-angusla';

// Configure AWS SDK
AWS.config.update({
  region: AWS_REGION,
  accessKeyId: import.meta.env['VITE_AWS_ACCESS_KEY_ID'],
  secretAccessKey: import.meta.env['VITE_AWS_SECRET_ACCESS_KEY'],
});

const s3 = new AWS.S3();

export interface DocumentMetadata {
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
  s3Url: string;
  s3Key: string;
}

/**
 * Auto-categorize files based on filename keywords
 */
function categorizeFile(fileName: string): string {
  const name = fileName.toLowerCase();
  
  if (name.includes('manual')) return '1'; // Meeting Minutes
  if (name.includes('log') || name.includes('maintenance')) return '2'; // Financial Reports  
  if (name.includes('insurance') || name.includes('certificate') || name.includes('cert')) return '3'; // Legal Documents
  
  return '1'; // Default to Meeting Minutes
}

/**
 * Upload file directly to S3
 */
export async function uploadFileToS3(
  file: File, 
  description?: string,
  categoryId?: string
): Promise<DocumentMetadata> {
  try {
    // Generate unique filename
    const fileId = uuidv4();
    const fileName = `${fileId}-${file.name}`;
    const s3Key = `documents/${fileName}`;
    
    // Upload parameters
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: file,
      ContentType: file.type,
      Metadata: {
        'original-name': file.name,
        'uploaded-by': 'user1', // TODO: Get from auth context
        'uploaded-at': new Date().toISOString(),
      }
    };
    
    console.log('Uploading to S3:', uploadParams);
    
    // Upload to S3
    const result = await s3.upload(uploadParams).promise();
    
    console.log('S3 upload successful:', result);
    
    // Create document metadata
    const document: DocumentMetadata = {
      id: fileId,
      fileName: fileName,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: categoryId || categorizeFile(file.name),
      uploadedBy: 'user1', // TODO: Get from auth context
      uploadedAt: new Date().toISOString(),
      description: description || '',
      tags: [],
      s3Url: result.Location,
      s3Key: s3Key
    };
    
    // Save metadata to localStorage as fallback
    saveDocumentMetadata(document);
    
    return document;
    
  } catch (error) {
    console.error('S3 upload failed:', error);
    
    // Fallback: Create blob URL for local storage
    const blobUrl = URL.createObjectURL(file);
    const fileId = uuidv4();
    
    const fallbackDocument: DocumentMetadata = {
      id: fileId,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category: categoryId || categorizeFile(file.name),
      uploadedBy: 'user1',
      uploadedAt: new Date().toISOString(),
      description: description || '',
      tags: [],
      s3Url: blobUrl,
      s3Key: `local/${fileId}`
    };
    
    saveDocumentMetadata(fallbackDocument);
    
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save document metadata to localStorage
 */
function saveDocumentMetadata(document: DocumentMetadata): void {
  try {
    const existingDocs = getStoredDocuments();
    existingDocs.push(document);
    localStorage.setItem('freehold-documents', JSON.stringify(existingDocs));
  } catch (error) {
    console.error('Failed to save document metadata:', error);
  }
}

/**
 * Get stored documents from localStorage
 */
export function getStoredDocuments(): DocumentMetadata[] {
  try {
    const stored = localStorage.getItem('freehold-documents');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load stored documents:', error);
    return [];
  }
}

/**
 * Delete document from S3 and local storage
 */
export async function deleteDocument(document: DocumentMetadata): Promise<void> {
  try {
    // Delete from S3 if it's not a local blob
    if (!document.s3Key.startsWith('local/')) {
      const deleteParams = {
        Bucket: S3_BUCKET,
        Key: document.s3Key
      };
      
      await s3.deleteObject(deleteParams).promise();
      console.log('Deleted from S3:', document.s3Key);
    } else {
      // Revoke blob URL
      URL.revokeObjectURL(document.s3Url);
    }
    
    // Remove from localStorage
    const existingDocs = getStoredDocuments();
    const updatedDocs = existingDocs.filter(doc => doc.id !== document.id);
    localStorage.setItem('freehold-documents', JSON.stringify(updatedDocs));
    
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw error;
  }
}

/**
 * Check if AWS credentials are configured
 */
export function isAWSConfigured(): boolean {
  return !!(
    import.meta.env['VITE_AWS_ACCESS_KEY_ID'] && 
    import.meta.env['VITE_AWS_SECRET_ACCESS_KEY']
  );
}