// Upload session model interface and types
// Requirements: 2.6 (metadata tracking), 5.3 (security)

export interface UploadSession {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  status: UploadStatus;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export type UploadStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface CreateUploadSessionData {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
}

export interface UpdateUploadSessionData {
  status?: UploadStatus;
  errorMessage?: string;
  completedAt?: Date;
}

// Database row interface
export interface UploadSessionRow {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  s3_key: string;
  status: UploadStatus;
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
  expires_at: Date;
}