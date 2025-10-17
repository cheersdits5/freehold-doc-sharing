import { useState, useEffect, useCallback } from 'react';
import { FileService } from '../services/fileService';
import { DocumentInfo, FileFilters } from '../types/document';

export function useDocuments(filters?: FileFilters) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await FileService.getDocuments(filters);
      setDocuments(response.documents);
      setTotalCount(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(response.page);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const refresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    refresh,
  };
}