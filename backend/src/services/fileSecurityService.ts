// File security service for enhanced file validation and security measures
// Requirements: 2.1, 2.5, 5.1, 5.4

import { logger } from '../utils/logger';
import { virusScanService, VirusScanResult } from './virusScanService';

export interface FileSecurityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    detectedMimeType?: string;
    fileSignature?: string;
    isExecutable?: boolean;
    hasEmbeddedContent?: boolean;
    virusScanResult?: VirusScanResult;
  };
}

export interface FileAuditLog {
  userId: string;
  action: 'upload' | 'download' | 'delete' | 'view' | 'update';
  fileId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: any;
}

/**
 * File Security Service
 * Provides enhanced file validation, security checks, and audit logging
 */
export class FileSecurityService {
  
  // File signature mappings for MIME type validation
  private readonly fileSignatures: { [key: string]: string[] } = {
    'application/pdf': ['25504446'], // %PDF
    'image/jpeg': ['FFD8FF'], // JPEG
    'image/png': ['89504E47'], // PNG
    'image/gif': ['474946383761', '474946383961'], // GIF87a, GIF89a
    'application/msword': ['D0CF11E0A1B11AE1'], // MS Office (old format)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['504B0304'], // ZIP-based (DOCX)
    'application/vnd.ms-excel': ['D0CF11E0A1B11AE1'], // MS Excel (old format)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['504B0304'], // ZIP-based (XLSX)
    'text/plain': [], // Text files can have various signatures
  };

  // Dangerous file signatures to block
  private readonly dangerousSignatures: string[] = [
    '4D5A', // PE executable (Windows .exe, .dll)
    '7F454C46', // ELF executable (Linux)
    'CAFEBABE', // Java class file
    'FEEDFACE', // Mach-O executable (macOS)
    '213C617263683E', // Unix archive
  ];

  /**
   * Validate file security and integrity
   */
  async validateFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<FileSecurityResult> {
    const result: FileSecurityResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // 1. Validate file signature against MIME type
      const signatureValidation = this.validateFileSignature(fileBuffer, mimeType);
      if (!signatureValidation.isValid) {
        result.errors.push(...signatureValidation.errors);
        result.warnings.push(...signatureValidation.warnings);
        result.isValid = false;
      }
      result.metadata.detectedMimeType = signatureValidation.detectedMimeType;
      result.metadata.fileSignature = signatureValidation.signature;

      // 2. Check for dangerous file signatures
      const dangerousCheck = this.checkDangerousSignatures(fileBuffer);
      if (!dangerousCheck.isValid) {
        result.errors.push(...dangerousCheck.errors);
        result.isValid = false;
      }
      result.metadata.isExecutable = dangerousCheck.isExecutable;

      // 3. Validate file name and extension
      const nameValidation = this.validateFileName(originalName, mimeType);
      if (!nameValidation.isValid) {
        result.errors.push(...nameValidation.errors);
        result.warnings.push(...nameValidation.warnings);
        result.isValid = false;
      }

      // 4. Check for embedded content (basic check)
      const embeddedCheck = this.checkEmbeddedContent(fileBuffer, mimeType);
      result.warnings.push(...embeddedCheck.warnings);
      result.metadata.hasEmbeddedContent = embeddedCheck.hasEmbedded;

      // 5. Validate file size consistency
      if (fileBuffer.length === 0) {
        result.errors.push('File is empty');
        result.isValid = false;
      }

      // 6. Check for null bytes (potential security issue)
      if (this.containsNullBytes(fileBuffer)) {
        result.warnings.push('File contains null bytes, which may indicate binary content');
      }

      // 7. Optional virus scanning
      if (virusScanService.isVirusScanEnabled()) {
        const virusScanResult = await virusScanService.scanFile(fileBuffer, originalName);
        result.metadata.virusScanResult = virusScanResult;
        
        if (!virusScanResult.isClean) {
          result.errors.push(`Virus scan detected threats: ${virusScanResult.threats.join(', ')}`);
          result.isValid = false;
        }
        
        if (virusScanResult.errorMessage) {
          result.warnings.push(`Virus scan warning: ${virusScanResult.errorMessage}`);
        }
      }

    } catch (error) {
      logger.error('File security validation error', error as Error, undefined, {
        fileName: originalName,
        mimeType,
        fileSize: fileBuffer.length
      });
      
      result.errors.push('File security validation failed');
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validate file signature against declared MIME type
   */
  private validateFileSignature(fileBuffer: Buffer, declaredMimeType: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    detectedMimeType?: string;
    signature: string;
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      detectedMimeType: undefined as string | undefined,
      signature: ''
    };

    if (fileBuffer.length < 4) {
      result.errors.push('File too small to validate signature');
      result.isValid = false;
      return result;
    }

    // Get file signature (first 8 bytes)
    const signature = fileBuffer.subarray(0, 8).toString('hex').toUpperCase();
    result.signature = signature;

    // Check against known signatures
    let detectedType: string | undefined;
    
    for (const [mimeType, signatures] of Object.entries(this.fileSignatures)) {
      for (const sig of signatures) {
        if (signature.startsWith(sig)) {
          detectedType = mimeType;
          break;
        }
      }
      if (detectedType) break;
    }

    result.detectedMimeType = detectedType;

    // Special handling for text files
    if (declaredMimeType === 'text/plain') {
      // For text files, check if content is actually text
      const isText = this.isTextContent(fileBuffer);
      if (!isText) {
        result.warnings.push('File declared as text but contains binary data');
      }
      return result;
    }

    // Validate signature matches declared type
    if (detectedType && detectedType !== declaredMimeType) {
      result.errors.push(`File signature indicates ${detectedType} but declared as ${declaredMimeType}`);
      result.isValid = false;
    } else if (!detectedType && this.fileSignatures[declaredMimeType]?.length > 0) {
      result.warnings.push('Could not verify file signature for declared MIME type');
    }

    return result;
  }

  /**
   * Check for dangerous file signatures
   */
  private checkDangerousSignatures(fileBuffer: Buffer): {
    isValid: boolean;
    errors: string[];
    isExecutable: boolean;
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      isExecutable: false
    };

    if (fileBuffer.length < 4) {
      return result;
    }

    const signature = fileBuffer.subarray(0, 8).toString('hex').toUpperCase();

    for (const dangerousSig of this.dangerousSignatures) {
      if (signature.startsWith(dangerousSig)) {
        result.errors.push('File appears to be an executable or dangerous file type');
        result.isValid = false;
        result.isExecutable = true;
        break;
      }
    }

    return result;
  }

  /**
   * Validate file name and extension
   */
  private validateFileName(fileName: string, mimeType: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Get file extension
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
    
    // Define expected extensions for MIME types
    const expectedExtensions: { [key: string]: string[] } = {
      'application/pdf': ['pdf'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'text/plain': ['txt', 'text'],
    };

    const expected = expectedExtensions[mimeType];
    if (expected && !expected.includes(extension)) {
      result.warnings.push(`File extension '${extension}' doesn't match MIME type '${mimeType}'`);
    }

    // Check for double extensions (potential security risk)
    const parts = fileName.split('.');
    if (parts.length > 2) {
      const secondToLast = parts[parts.length - 2].toLowerCase();
      const dangerousSecondExtensions = ['exe', 'bat', 'cmd', 'scr', 'vbs', 'js'];
      
      if (dangerousSecondExtensions.includes(secondToLast)) {
        result.errors.push('File has potentially dangerous double extension');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Check for embedded content in files
   */
  private checkEmbeddedContent(fileBuffer: Buffer, mimeType: string): {
    warnings: string[];
    hasEmbedded: boolean;
  } {
    const result = {
      warnings: [] as string[],
      hasEmbedded: false
    };

    // Check for embedded JavaScript in PDFs
    if (mimeType === 'application/pdf') {
      const content = fileBuffer.toString('ascii');
      if (content.includes('/JavaScript') || content.includes('/JS')) {
        result.warnings.push('PDF contains embedded JavaScript');
        result.hasEmbedded = true;
      }
    }

    // Check for macros in Office documents
    if (mimeType.includes('officedocument') || mimeType.includes('msword') || mimeType.includes('ms-excel')) {
      // ZIP-based Office documents
      if (fileBuffer.toString('ascii').includes('vbaProject.bin')) {
        result.warnings.push('Office document contains macros');
        result.hasEmbedded = true;
      }
    }

    return result;
  }

  /**
   * Check if content is text
   */
  private isTextContent(buffer: Buffer): boolean {
    // Check first 1KB for text content
    const sample = buffer.subarray(0, Math.min(1024, buffer.length));
    
    // Count non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Allow common text characters: printable ASCII, newlines, tabs
      if (!(byte >= 32 && byte <= 126) && byte !== 10 && byte !== 13 && byte !== 9) {
        nonPrintable++;
      }
    }
    
    // If more than 10% non-printable, likely binary
    return (nonPrintable / sample.length) < 0.1;
  }

  /**
   * Check for null bytes in file
   */
  private containsNullBytes(buffer: Buffer): boolean {
    return buffer.includes(0);
  }

  /**
   * Log file operation for audit trail
   */
  async logFileOperation(auditLog: FileAuditLog): Promise<void> {
    try {
      // Log to application logger
      logger.info('File operation audit', undefined, undefined, {
        userId: auditLog.userId,
        action: auditLog.action,
        fileId: auditLog.fileId,
        fileName: auditLog.fileName,
        fileSize: auditLog.fileSize,
        mimeType: auditLog.mimeType,
        ipAddress: auditLog.ipAddress,
        userAgent: auditLog.userAgent,
        success: auditLog.success,
        errorMessage: auditLog.errorMessage,
        metadata: auditLog.metadata
      });

      // In a production environment, you might also want to:
      // 1. Store audit logs in a separate database table
      // 2. Send to a SIEM system
      // 3. Store in a separate log file
      // 4. Send to external audit service

    } catch (error) {
      logger.error('Failed to log file operation audit', error as Error, undefined, {
        auditLog
      });
    }
  }

  /**
   * Generate file security report
   */
  generateSecurityReport(validationResult: FileSecurityResult, fileName: string): string {
    const report = [];
    
    report.push(`File Security Report for: ${fileName}`);
    report.push(`Validation Status: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
    report.push(`Timestamp: ${new Date().toISOString()}`);
    report.push('');
    
    if (validationResult.metadata.detectedMimeType) {
      report.push(`Detected MIME Type: ${validationResult.metadata.detectedMimeType}`);
    }
    
    if (validationResult.metadata.fileSignature) {
      report.push(`File Signature: ${validationResult.metadata.fileSignature}`);
    }
    
    if (validationResult.metadata.isExecutable) {
      report.push('⚠️  File appears to be executable');
    }
    
    if (validationResult.metadata.hasEmbeddedContent) {
      report.push('⚠️  File contains embedded content');
    }
    
    if (validationResult.metadata.virusScanResult) {
      const scanResult = validationResult.metadata.virusScanResult;
      report.push(`Virus Scan: ${scanResult.isClean ? '✅ Clean' : '❌ Threats Detected'}`);
      report.push(`Scan Engine: ${scanResult.scanEngine}`);
      report.push(`Scan Time: ${scanResult.scanTimestamp.toISOString()}`);
      
      if (scanResult.threats.length > 0) {
        report.push(`Threats: ${scanResult.threats.join(', ')}`);
      }
      
      if (scanResult.errorMessage) {
        report.push(`Scan Error: ${scanResult.errorMessage}`);
      }
    }
    
    if (validationResult.errors.length > 0) {
      report.push('');
      report.push('ERRORS:');
      validationResult.errors.forEach(error => report.push(`❌ ${error}`));
    }
    
    if (validationResult.warnings.length > 0) {
      report.push('');
      report.push('WARNINGS:');
      validationResult.warnings.forEach(warning => report.push(`⚠️  ${warning}`));
    }
    
    return report.join('\n');
  }
}

// Export singleton instance
export const fileSecurityService = new FileSecurityService();