// Category management service
// Requirements: 4.1, 4.2, 4.4 (category management)

import { BaseRepository, dbUtils } from '../database/queries';
import { 
  Category, 
  CreateCategoryData, 
  UpdateCategoryData, 
  CategoryWithCount,
  CategoryRow,
  DEFAULT_CATEGORIES 
} from '../models/Category';

export class CategoryService extends BaseRepository {
  constructor() {
    super('categories');
  }

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    const categoryData = {
      id: dbUtils.generateId(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await this.insert<CategoryRow>(categoryData);
    return this.mapRowToCategory(result);
  }

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    const rows = await this.findWhere<CategoryRow>({}, 'name ASC');
    return rows.map(row => this.mapRowToCategory(row));
  }

  /**
   * Get categories with document counts
   */
  async getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
    const query = `
      SELECT 
        c.*,
        COUNT(d.id) as document_count
      FROM categories c
      LEFT JOIN documents d ON c.id = d.category_id
      GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
      ORDER BY c.name ASC
    `;

    const result = await this.db.query<CategoryRow & { document_count: string }>(query);
    
    return result.rows.map(row => ({
      ...this.mapRowToCategory(row),
      documentCount: parseInt(row.document_count)
    }));
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    const row = await this.findById<CategoryRow>(id);
    return row ? this.mapRowToCategory(row) : null;
  }

  /**
   * Get category by name
   */
  async getCategoryByName(name: string): Promise<Category | null> {
    const rows = await this.findWhere<CategoryRow>({ name: name.trim() });
    return rows.length > 0 ? this.mapRowToCategory(rows[0]) : null;
  }

  /**
   * Update category
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category | null> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    
    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    const result = await this.updateById<CategoryRow>(id, updateData);
    return result ? this.mapRowToCategory(result) : null;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<boolean> {
    // Check if category has documents
    const documentCount = await this.getDocumentCount(id);
    if (documentCount > 0) {
      throw new Error('Cannot delete category that contains documents');
    }

    return await this.deleteById(id);
  }

  /**
   * Get document count for a category
   */
  async getDocumentCount(categoryId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM documents WHERE category_id = $1';
    const result = await this.db.query<{ count: string }>(query, [categoryId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Check if category name exists (for validation)
   */
  async categoryNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM categories WHERE LOWER(name) = LOWER($1)';
    const params: any[] = [name.trim()];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await this.db.query<{ count: string }>(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Initialize default categories
   */
  async initializeDefaultCategories(): Promise<void> {
    for (const defaultCategory of DEFAULT_CATEGORIES) {
      const exists = await this.getCategoryByName(defaultCategory.name);
      if (!exists) {
        await this.createCategory(defaultCategory);
      }
    }
  }

  /**
   * Search categories by name
   */
  async searchCategories(searchTerm: string, limit: number = 50): Promise<Category[]> {
    const query = `
      SELECT * FROM categories 
      WHERE LOWER(name) LIKE LOWER($1) OR LOWER(description) LIKE LOWER($1)
      ORDER BY name ASC
      LIMIT $2
    `;
    
    const searchPattern = `%${searchTerm.trim()}%`;
    const result = await this.db.query<CategoryRow>(query, [searchPattern, limit]);
    
    return result.rows.map(row => this.mapRowToCategory(row));
  }

  /**
   * Get categories used by a specific user
   */
  async getCategoriesByUser(userId: string): Promise<CategoryWithCount[]> {
    const query = `
      SELECT 
        c.*,
        COUNT(d.id) as document_count
      FROM categories c
      INNER JOIN documents d ON c.id = d.category_id
      WHERE d.uploaded_by = $1
      GROUP BY c.id, c.name, c.description, c.created_at, c.updated_at
      ORDER BY document_count DESC, c.name ASC
    `;

    const result = await this.db.query<CategoryRow & { document_count: string }>(query, [userId]);
    
    return result.rows.map(row => ({
      ...this.mapRowToCategory(row),
      documentCount: parseInt(row.document_count)
    }));
  }

  /**
   * Map database row to Category object
   */
  private mapRowToCategory(row: CategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Access to database connection for complex queries
  private get db() {
    return require('../database/connection').db;
  }
}

// Factory function to create CategoryService instance
export const createCategoryService = (): CategoryService => {
  return new CategoryService();
};