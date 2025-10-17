-- Migration: Add security metadata to documents table
-- Requirements: 5.1, 5.4 (enhanced file security measures)

-- Add security_metadata column to store file security information
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS security_metadata JSONB;

-- Create index for security metadata queries
CREATE INDEX IF NOT EXISTS idx_documents_security_metadata 
ON documents USING GIN(security_metadata);

-- Add comment to document the column purpose
COMMENT ON COLUMN documents.security_metadata IS 'JSON metadata containing file security validation results, detected MIME types, file signatures, and security warnings';

-- Example of security_metadata structure:
-- {
--   "detectedMimeType": "application/pdf",
--   "fileSignature": "25504446",
--   "hasEmbeddedContent": false,
--   "securityWarnings": ["File contains null bytes"],
--   "scanTimestamp": "2024-01-01T00:00:00Z"
-- }