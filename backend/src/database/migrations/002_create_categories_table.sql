-- Migration: Create categories table
-- Requirements: 3.4 (document organization), 2.6 (metadata)

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_created_at ON categories(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for freehold community
INSERT INTO categories (name, description) VALUES
    ('Meeting Minutes', 'Records of community meetings and decisions'),
    ('Bylaws', 'Community bylaws and governing documents'),
    ('Maintenance', 'Property maintenance and repair documents'),
    ('Financial', 'Financial reports and budget documents'),
    ('Legal', 'Legal documents and contracts'),
    ('General', 'General community documents and announcements')
ON CONFLICT (name) DO NOTHING;