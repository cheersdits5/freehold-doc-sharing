// Category management controller
// Requirements: 4.1, 4.2, 4.4 (category management)

import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { createCategoryService } from '../services/categoryService';

export class CategoryController {
  private categoryService = createCategoryService();

  /**
   * Get all categories
   * GET /api/categories
   */
  async getCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { withCounts = 'false' } = req.query;
      
      let categories;
      if (withCounts === 'true') {
        categories = await this.categoryService.getCategoriesWithCounts();
      } else {
        categories = await this.categoryService.getAllCategories();
      }

      res.status(200).json({
        success: true,
        data: { categories },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get categories error:', error);
      
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  async getCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const category = await this.categoryService.getCategoryById(id);

      if (!category) {
        res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { category },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get category error:', error);
      
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch category',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create new category
   * POST /api/categories
   */
  async createCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only admins can create categories
      if (req.user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can create categories',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { name, description } = req.body;

      // Check if category name already exists
      const existingCategory = await this.categoryService.getCategoryByName(name);
      if (existingCategory) {
        res.status(409).json({
          error: {
            code: 'CATEGORY_EXISTS',
            message: 'A category with this name already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const category = await this.categoryService.createCategory({ name, description });

      res.status(201).json({
        success: true,
        data: {
          category,
          message: 'Category created successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Create category error:', error);
      
      res.status(500).json({
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create category',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Update category
   * PUT /api/categories/:id
   */
  async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only admins can update categories
      if (req.user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can update categories',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;
      const { name, description } = req.body;

      // Check if category exists
      const existingCategory = await this.categoryService.getCategoryById(id);
      if (!existingCategory) {
        res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Check if new name conflicts with existing category
      if (name && name !== existingCategory.name) {
        const nameExists = await this.categoryService.categoryNameExists(name, id);
        if (nameExists) {
          res.status(409).json({
            error: {
              code: 'CATEGORY_NAME_EXISTS',
              message: 'A category with this name already exists',
              timestamp: new Date().toISOString()
            }
          });
          return;
        }
      }

      const updatedCategory = await this.categoryService.updateCategory(id, { name, description });

      res.status(200).json({
        success: true,
        data: {
          category: updatedCategory,
          message: 'Category updated successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Update category error:', error);
      
      res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update category',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  async deleteCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only admins can delete categories
      if (req.user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can delete categories',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { id } = req.params;

      // Check if category exists
      const existingCategory = await this.categoryService.getCategoryById(id);
      if (!existingCategory) {
        res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const deleted = await this.categoryService.deleteCategory(id);

      if (!deleted) {
        res.status(500).json({
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete category',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Category deleted successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Delete category error:', error);
      
      if (error.message.includes('contains documents')) {
        res.status(409).json({
          error: {
            code: 'CATEGORY_HAS_DOCUMENTS',
            message: 'Cannot delete category that contains documents',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      
      res.status(500).json({
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete category',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Search categories
   * GET /api/categories/search
   */
  async searchCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const { q: searchTerm, limit = '50' } = req.query;

      if (!searchTerm) {
        res.status(400).json({
          error: {
            code: 'MISSING_SEARCH_TERM',
            message: 'Search term is required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const limitNum = parseInt(limit as string, 10);
      const categories = await this.categoryService.searchCategories(searchTerm as string, limitNum);

      res.status(200).json({
        success: true,
        data: {
          categories,
          total: categories.length,
          searchTerm
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Search categories error:', error);
      
      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Get categories used by current user
   * GET /api/categories/my-categories
   */
  async getMyCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      const categories = await this.categoryService.getCategoriesByUser(req.user.userId);

      res.status(200).json({
        success: true,
        data: { categories },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get my categories error:', error);
      
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch user categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Initialize default categories (admin only)
   * POST /api/categories/initialize-defaults
   */
  async initializeDefaults(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Only admins can initialize defaults
      if (req.user.role !== 'admin') {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only administrators can initialize default categories',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      await this.categoryService.initializeDefaultCategories();

      res.status(200).json({
        success: true,
        data: {
          message: 'Default categories initialized successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Initialize defaults error:', error);
      
      res.status(500).json({
        error: {
          code: 'INITIALIZATION_FAILED',
          message: 'Failed to initialize default categories',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

// Export singleton instance
export const categoryController = new CategoryController();