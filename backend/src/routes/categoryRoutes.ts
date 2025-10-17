// Category management routes
// Requirements: 4.1, 4.2, 4.4 (category management)

import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { authMiddleware, sessionMiddleware, requireAdmin } from '../middleware/authMiddleware';
import { validateCategoryCreate, validateCategoryUpdate } from '../middleware/validationMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(sessionMiddleware);

/**
 * @route   GET /api/categories
 * @desc    Get all categories (optionally with document counts)
 * @access  Private (authenticated users)
 * @query   withCounts=true to include document counts
 */
router.get('/',
  categoryController.getCategories.bind(categoryController)
);

/**
 * @route   GET /api/categories/search
 * @desc    Search categories by name or description
 * @access  Private (authenticated users)
 * @query   q=searchTerm, limit=number
 */
router.get('/search',
  categoryController.searchCategories.bind(categoryController)
);

/**
 * @route   GET /api/categories/my-categories
 * @desc    Get categories used by current user
 * @access  Private (authenticated users)
 */
router.get('/my-categories',
  categoryController.getMyCategories.bind(categoryController)
);

/**
 * @route   POST /api/categories/initialize-defaults
 * @desc    Initialize default freehold categories
 * @access  Private (admin only)
 */
router.post('/initialize-defaults',
  requireAdmin,
  categoryController.initializeDefaults.bind(categoryController)
);

/**
 * @route   POST /api/categories
 * @desc    Create a new category
 * @access  Private (admin only)
 */
router.post('/',
  requireAdmin,
  validateCategoryCreate,
  categoryController.createCategory.bind(categoryController)
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private (authenticated users)
 */
router.get('/:id',
  categoryController.getCategory.bind(categoryController)
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (admin only)
 */
router.put('/:id',
  requireAdmin,
  validateCategoryUpdate,
  categoryController.updateCategory.bind(categoryController)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (admin only)
 */
router.delete('/:id',
  requireAdmin,
  categoryController.deleteCategory.bind(categoryController)
);

export default router;