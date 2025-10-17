// Authentication routes
// Requirements: 1.1, 1.2, 1.3, 1.4, 1.5

import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware, sessionMiddleware } from '../middleware/authMiddleware';
import { validateLoginInput } from '../middleware/validationMiddleware';
import { authRateLimit } from '../middleware/securityMiddleware';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', 
  authRateLimit, // Enhanced rate limiting with logging
  validateLoginInput, 
  authController.login.bind(authController)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token using refresh token
 * @access  Public (requires refresh token in cookie)
 */
router.post('/refresh', authController.refreshToken.bind(authController));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear refresh token
 * @access  Public
 */
router.post('/logout', authController.logout.bind(authController));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', 
  authMiddleware, 
  sessionMiddleware, 
  authController.getCurrentUser.bind(authController)
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate JWT token
 * @access  Private
 */
router.get('/validate', 
  authMiddleware, 
  authController.validateToken.bind(authController)
);

export default router;