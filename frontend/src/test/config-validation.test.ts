import { describe, it, expect } from 'vitest';
import { FileService } from '../services/fileService';

describe('Configuration Validation', () => {
  it('should have correct API client configuration', async () => {
    // Test that API client is configured to use proxy
    const { apiClient } = await import('../utils/apiClient');
    expect(apiClient.defaults.baseURL).toBe('/api');
  });

  it('should validate file types correctly', () => {
    // Test valid file types
    const validFiles = [
      new File(['content'], 'test.pdf', { type: 'application/pdf' }),
      new File(['content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      }),
      new File(['content'], 'test.jpg', { type: 'image/jpeg' }),
      new File(['content'], 'test.png', { type: 'image/png' }),
      new File(['content'], 'test.txt', { type: 'text/plain' }),
    ];

    validFiles.forEach(file => {
      expect(FileService.validateFile(file)).toBeNull();
    });

    // Test invalid file types
    const invalidFile = new File(['content'], 'test.exe', { 
      type: 'application/x-executable' 
    });
    expect(FileService.validateFile(invalidFile)).toContain('File type not supported');

    // Test file size limit
    const largeFile = new File([new ArrayBuffer(51 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    expect(FileService.validateFile(largeFile)).toContain('File size exceeds 50MB limit');
  });

  it('should have correct environment configuration', () => {
    // Check that environment variables are accessible
    expect(import.meta.env.VITE_API_BASE_URL).toBeDefined();
    expect(import.meta.env['VITE_APP_NAME']).toBeDefined();
  });

  it('should have proper service configurations', () => {
    // Test that services are properly configured
    expect(FileService.uploadFile).toBeDefined();
    expect(FileService.getDocuments).toBeDefined();
    expect(FileService.getDownloadUrl).toBeDefined();
    expect(FileService.getCategories).toBeDefined();
    expect(FileService.validateFile).toBeDefined();
  });

  it('should have authentication service configured', async () => {
    const { authService } = await import('../services/authService');
    expect(authService.login).toBeDefined();
    expect(authService.refreshToken).toBeDefined();
    expect(authService.validateToken).toBeDefined();
  });
});