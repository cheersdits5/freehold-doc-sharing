import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  InsertDriveFile,
  Delete,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { FileService } from '../services/fileService';
import { FileUploadProgress, Category } from '../types/document';
import { useError } from '../contexts/ErrorContext';
import { ProgressWithLabel, ButtonLoading } from './LoadingSpinner';
import { useValidation } from './FormValidation';
import { useFormSubmission } from '../hooks/useLoading';

interface FileUploadProps {
  categories: Category[];
  onUploadComplete?: (uploadedFiles: any[]) => void;
}

export function FileUpload({ categories, onUploadComplete }: FileUploadProps) {
  const { showError, showSuccess } = useError();
  const { submitting: isUploading, handleSubmit } = useFormSubmission();
  
  const [uploadQueue, setUploadQueue] = useState<FileUploadProgress[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Validation for category selection
  const categoryValidation = useValidation({
    required: true,
    requiredMessage: 'Please select a category for your files',
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileUploadProgress[] = acceptedFiles.map(file => {
      const validationError = FileService.validateFile(file);
      return {
        file,
        progress: 0,
        status: validationError ? ('error' as const) : ('pending' as const),
        error: validationError || undefined,
      };
    });

    setUploadQueue(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    // Validate category selection
    if (!categoryValidation.validate(selectedCategory)) {
      showError('Please select a category for your files');
      return;
    }

    const validFiles = uploadQueue.filter(item => item.status !== 'error');
    if (validFiles.length === 0) {
      showError('No valid files to upload');
      return;
    }

    await handleSubmit(async () => {
      const uploadedFiles: any[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < uploadQueue.length; i++) {
        const item = uploadQueue[i];
        if (!item || item.status === 'error') continue;

        try {
          // Update status to uploading
          setUploadQueue(prev => 
            prev.map((file, index) => 
              index === i ? { ...file, status: 'uploading' as const } : file
            )
          );

          const result = await FileService.uploadFile(
            item!.file,
            selectedCategory,
            description,
            (progress) => {
              setUploadQueue(prev => 
                prev.map((file, index) => 
                  index === i ? { ...file, progress } : file
                )
              );
            }
          );

          // Update status to completed
          setUploadQueue(prev => 
            prev.map((file, index) => 
              index === i ? { ...file, status: 'completed' as const, progress: 100 } : file
            )
          );

          uploadedFiles.push(result);
          successCount++;
        } catch (error: unknown) {
          // Update status to error
          let errorMessage = 'Upload failed';
          if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
          }
          setUploadQueue(prev => 
            prev.map((file, index) => 
              index === i ? { 
                ...file, 
                status: 'error' as const, 
                error: errorMessage
              } : file
            )
          );
          errorCount++;
        }
      }

      // Show success/error messages
      if (successCount > 0) {
        showSuccess(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`);
        onUploadComplete?.(uploadedFiles);
        // Clear successful uploads
        setUploadQueue(prev => prev.filter(item => item.status === 'error'));
        setDescription('');
      }

      if (errorCount > 0) {
        showError(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload. Please check the errors and try again.`);
      }
    });
  };

  const getStatusIcon = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'uploading':
        return <CloudUpload color="primary" />;
      default:
        return <InsertDriveFile />;
    }
  };

  const getStatusColor = (status: FileUploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Dropzone */}
      <Box
        {...getRootProps()}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          textAlign: 'center',
          mb: 3,
          opacity: isUploading ? 0.6 : 1,
          borderRadius: 1,
        }}
        role="button"
        tabIndex={0}
        aria-label="File upload area. Click or drag files here to upload"
      >
        <input {...getInputProps()} aria-hidden="true" />
        <CloudUpload sx={{ 
          fontSize: { xs: 36, sm: 48 }, 
          color: 'grey.400', 
          mb: 2 
        }} />
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{
            fontSize: { xs: '0.7rem', sm: '0.75rem' }
          }}
        >
          Supported: PDF, DOC, DOCX, TXT, Images (max 50MB each)
        </Typography>
      </Box>

      {/* Upload Configuration */}
      {uploadQueue.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
              disabled={isUploading}
              aria-describedby="category-helper-text"
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            disabled={isUploading}
            sx={{ mb: 2 }}
            inputProps={{
              'aria-label': 'Optional description for uploaded files'
            }}
          />
        </Box>
      )}

      {/* File Queue */}
      {uploadQueue.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">
              Upload Queue ({uploadQueue.length} files)
            </Typography>
          </Box>
          <List>
            {uploadQueue.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {getStatusIcon(item.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {item.file.name}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        color={getStatusColor(item.status)}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      {item.status === 'uploading' && (
                        <Box sx={{ mt: 1 }}>
                          <ProgressWithLabel 
                            value={item.progress} 
                            label={`${Math.round(item.progress)}%`}
                          />
                        </Box>
                      )}
                      {item.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {item.error}
                        </Alert>
                      )}
                    </Box>
                  }
                />
                {!isUploading && item.status !== 'completed' && (
                  <IconButton
                    edge="end"
                    onClick={() => removeFile(index)}
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Upload Button */}
      {uploadQueue.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Button
            variant="contained"
            onClick={uploadFiles}
            disabled={isUploading || !selectedCategory}
            startIcon={<CloudUpload />}
            aria-label={`Upload ${uploadQueue.filter(f => f.status !== 'error').length} files`}
            sx={{ flex: { xs: 1, sm: 'none' } }}
          >
            <ButtonLoading loading={isUploading}>
              {isUploading ? 'Uploading...' : `Upload ${uploadQueue.filter(f => f.status !== 'error').length} Files`}
            </ButtonLoading>
          </Button>
          {!isUploading && (
            <Button
              variant="outlined"
              onClick={() => setUploadQueue([])}
              aria-label="Clear upload queue"
              sx={{ flex: { xs: 1, sm: 'none' } }}
            >
              Clear Queue
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}