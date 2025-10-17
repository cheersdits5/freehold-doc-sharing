// Category model interface and types
// Requirements: 3.4 (document organization)

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

export interface CategoryWithCount extends Category {
  documentCount: number;
}

// Database row interface
export interface CategoryRow {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Default categories for freehold community
export const DEFAULT_CATEGORIES = [
  { name: 'Meeting Minutes', description: 'Records of community meetings and decisions' },
  { name: 'Bylaws', description: 'Community bylaws and governing documents' },
  { name: 'Maintenance', description: 'Property maintenance and repair documents' },
  { name: 'Financial', description: 'Financial reports and budget documents' },
  { name: 'Legal', description: 'Legal documents and contracts' },
  { name: 'General', description: 'General community documents and announcements' }
] as const;