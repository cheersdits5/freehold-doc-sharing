import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export interface S3UploadResult {
  key: string;
  location: string;
  etag: string;
  bucket: string;
}

export interface S3ServiceConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  presignedUrlExpires: number;
}

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;
  private presignedUrlExpires: number;

  constructor(config: S3ServiceConfig) {
    // Configure AWS SDK
    AWS.config.update({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    });

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
    });

    this.bucketName = config.bucketName;
    this.presignedUrlExpires = config.presignedUrlExpires;
  }

  /**
   * Upload a file to S3 with server-side encryption
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    userId: string
  ): Promise<S3UploadResult> {
    try {
      // Generate unique key for the file
      const fileExtension = path.extname(originalFileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const key = `documents/${userId}/${uniqueFileName}`;

      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'original-filename': originalFileName,
          'uploaded-by': userId,
          'upload-timestamp': new Date().toISOString(),
        },
      };

      const result = await this.s3.upload(uploadParams).promise();

      return {
        key: result.Key,
        location: result.Location,
        etag: result.ETag,
        bucket: result.Bucket,
      };
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  /**
   * Generate a pre-signed URL for secure file download
   */
  async generatePresignedDownloadUrl(key: string): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: this.presignedUrlExpires, // URL expires in seconds
        ResponseContentDisposition: 'attachment', // Force download
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Generate a pre-signed URL for file viewing (inline)
   */
  async generatePresignedViewUrl(key: string): Promise<string> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: this.presignedUrlExpires,
        ResponseContentDisposition: 'inline', // View in browser
      };

      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      throw new Error(`Failed to generate presigned view URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw new Error(`Failed to check file existence: ${error.message}`);
    }
  }

  /**
   * Get file metadata from S3
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return result;
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * List files in a specific prefix (folder)
   */
  async listFiles(prefix: string, maxKeys: number = 1000): Promise<AWS.S3.Object[]> {
    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents || [];
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }
}

// Factory function to create S3Service instance
export const createS3Service = (): S3Service => {
  const config: S3ServiceConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.S3_BUCKET_NAME || '',
    presignedUrlExpires: parseInt(process.env.S3_PRESIGNED_URL_EXPIRES || '900'),
  };

  // Validate required configuration
  if (!config.accessKeyId || !config.secretAccessKey || !config.bucketName) {
    throw new Error('Missing required AWS S3 configuration. Please check your environment variables.');
  }

  return new S3Service(config);
};