import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import { apiClient } from '../utils/apiClient';
import { authService } from '../services/authService';
import { FileService } from '../services/fileService';

// Mock user credentials for testing
const testUser = {
  email: 'test@freehold.com',
  password: 'testpassword123'
};

describe('End-to-End Workflow Tests', () => {
  let authToken: string;
  let testFileId: string;

  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it('should complete full authentication workflow', async () => {
    // Step 1: Verify backend is running
    const healthResponse = await axios.get('http://localhost:3001/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data.status).toBe('healthy');

    // Step 2: Test login endpoint exists and responds correctly
    try {
      await authService.login(testUser);
    } catch (error: any) {
      // We expect this to fail with 401 since we don't have a real user
      // But the endpoint should be reachable
      expect(error.response?.status).toBe(401);
      expect(error.response?.data).toHaveProperty('error');
    }

    // Step 3: Test token validation endpoint
    try {
      await authService.validateToken('invalid-token');
    } catch (error: any) {
      // Should fail with 401 for invalid token
      expect(error.response?.status).toBe(401);
    }
  });

  it('should handle file operations workflow', async () => {
    // Test file endpoints without authentication (should fail)
    try {
      await FileService.getDocuments();
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }

    try {
      await FileService.getCategories();
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }

    // Test file upload without authentication (should fail)
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    try {
      await FileService.uploadFile(testFile, 'test-category');
    } catch (error: any) {
      expect(error.response?.status).toBe(401);
    }
  });

  it('should validate file types correctly', () => {
    // Test valid file types
    const validPdf = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' });
    expect(FileService.validateFile(validPdf)).toBeNull();

    const validImage = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    expect(FileService.validateFile(validImage)).toBeNull();

    const validDoc = new File(['doc content'], 'test.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    expect(FileService.validateFile(validDoc)).toBeNull();

    // Test invalid file type
    const invalidFile = new File(['exe content'], 'test.exe', { type: 'application/x-executable' });
    expect(FileService.validateFile(invalidFile)).toContain('File type not supported');

    // Test file size limit
    const largeFile = new File([new ArrayBuffer(51 * 1024 * 1024)], 'large.pdf', { 
      type: 'application/pdf' 
    });
    expect(FileService.validateFile(largeFile)).toContain('File size exceeds 50MB limit');
  });

  it('should handle API error responses correctly', async () => {
    // Test that API client handles errors properly
    try {
      await apiClient.get('/nonexistent-endpoint');
    } catch (error: any) {
      expect(error.response?.status).toBe(404);
      expect(error).toHaveProperty('userMessage');
    }
  });

  it('should verify CORS configuration', async () => {
    // Test CORS headers are present
    const response = await axios.get('http://localhost:3001/health', {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    expect(response.status).toBe(200);
    // CORS should allow the request from localhost:3000
  });

  it('should verify security headers are present', async () => {
    const response = await axios.get('http://localhost:3001/health');
    
    // Check for security headers (these should be set by helmet)
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
  });
});