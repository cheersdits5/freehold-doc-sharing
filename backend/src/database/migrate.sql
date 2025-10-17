-- Database migration runner
-- Execute all migrations in order

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run migrations in order
\i 001_create_users_table.sql
\i 002_create_categories_table.sql
\i 003_create_documents_table.sql
\i 004_create_upload_sessions_table.sql
\i 005_add_security_metadata.sql

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Record applied migrations
INSERT INTO schema_migrations (version) VALUES
    ('001_create_users_table'),
    ('002_create_categories_table'),
    ('003_create_documents_table'),
    ('004_create_upload_sessions_table'),
    ('005_add_security_metadata')
ON CONFLICT (version) DO NOTHING;