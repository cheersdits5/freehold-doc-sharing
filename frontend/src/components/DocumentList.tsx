import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search,
  Download,
  MoreVert,
  InsertDriveFile,
  PictureAsPdf,
  Description,
  Image,
} from '@mui/icons-material';
import { FileService } from '../services/fileService';
import { DocumentInfo, FileFilters } from '../types/document';
import { useCategories } from '../hooks/useCategories';

interface DocumentListProps {
  refreshTrigger?: number | undefined;
  selectedCategory?: string | undefined;
  onCategoryChange?: (categoryId: string | undefined) => void;
}

export function DocumentList({ 
  refreshTrigger,
  selectedCategory,
  onCategoryChange
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentInfo | null>(null);
  
  // Load categories
  const { categories } = useCategories();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const filters: FileFilters = {
        page: page + 1, // API expects 1-based pagination
        limit: rowsPerPage,
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      if (selectedCategory) {
        filters.category = selectedCategory;
      }

      const response = await FileService.getDocuments(filters);
      setDocuments(response.documents);
      setTotalCount(response.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, rowsPerPage, searchTerm, selectedCategory, refreshTrigger]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, document: DocumentInfo) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleDownload = async (document: DocumentInfo) => {
    try {
      const downloadUrl = await FileService.getDownloadUrl(document.id);
      // Create a temporary link to trigger download
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
    handleMenuClose();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image color="primary" />;
    }
    if (mimeType === 'application/pdf') {
      return <PictureAsPdf color="error" />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <Description color="info" />;
    }
    return <InsertDriveFile />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown';
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchDocuments} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Search and Filters */}
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center',
        flexDirection: { xs: 'column', sm: 'row' }
      }}>
        <TextField
          placeholder="Search documents..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ 
            flexGrow: 1,
            width: { xs: '100%', sm: 'auto' }
          }}
          inputProps={{
            'aria-label': 'Search documents by name or description'
          }}
        />
        
        {selectedCategory && (
          <Chip
            label={`Category: ${getCategoryName(selectedCategory)}`}
            onDelete={() => onCategoryChange?.(undefined)}
            color="primary"
            variant="outlined"
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
        )}
      </Box>

      {/* Document Table */}
      <TableContainer 
        component={Paper}
        sx={{ 
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: { xs: 650, sm: 750 }
          }
        }}
      >
        <Table aria-label="Documents table">
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Size</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Uploaded</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Tags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || selectedCategory ? 'No documents found matching your criteria' : 'No documents uploaded yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(document.mimeType)}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ 
                            wordBreak: 'break-word',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' }
                          }}
                        >
                          {document.originalName}
                        </Typography>
                        {document.description && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: { xs: 'block', sm: 'block' },
                              wordBreak: 'break-word'
                            }}
                          >
                            {document.description}
                          </Typography>
                        )}
                        {/* Show category and size on mobile */}
                        <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 0.5 }}>
                          <Chip
                            label={getCategoryName(document.category)}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 1, mb: 0.5 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(document.fileSize)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    <Chip
                      label={getCategoryName(document.category)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    <Typography variant="body2">
                      {formatFileSize(document.fileSize)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    <Typography variant="body2">
                      {formatDate(document.uploadedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {document.tags.slice(0, 2).map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                      {document.tags.length > 2 && (
                        <Chip
                          label={`+${document.tags.length - 2}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, document)}
                      size="small"
                      aria-label={`Actions for ${document.originalName}`}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedDocument && handleDownload(selectedDocument)}>
          <ListItemIcon>
            <Download fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}