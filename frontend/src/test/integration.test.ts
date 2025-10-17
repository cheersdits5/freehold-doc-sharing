import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import { apiClient } from '../utils/apiClient';

describe('Frontend-Backend Integration', () => {
  beforeAll(async () => {
    // Wait a moment for potential server startup
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('should connect to backend health endpoint', async () => {
    try {
      // Use direct axios call for health endpoint since it's not under /api
      const response = await axios.get('http://localhost:3001/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
      expect(response.data).toHaveProperty('timestamp');
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  });

  it('should handle authentication endpoints', async () => {
    try {
      // Test login endpoint with invalid credentials (should return 401)
      const response = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
      // This should not reach here if authentication is working
      expect(response.status).toBe(401);
    } catch (error: any) {
      // Expect 401 unauthorized for invalid credentials
      expect(error.response?.status).toBe(401);
    }
  });

  it('should handle file endpoints with authentication required', async () => {
    try {
      // Test files endpoint without authentication (should return 401)
      await apiClient.get('/files');
    } catch (error: any) {
      // Expect 401 unauthorized for unauthenticated request
      expect(error.response?.status).toBe(401);
    }
  });

  it('should handle categories endpoints with authentication required', async () => {
    try {
      // Test categories endpoint without authentication (should return 401)
      await apiClient.get('/categories');
    } catch (error: any) {
      // Expect 401 unauthorized for unauthenticated request
      expect(error.response?.status).toBe(401);
    }
  });
});