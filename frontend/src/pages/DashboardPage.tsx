// Dashboard page component
import { useState } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Container,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useAuthSession } from '../hooks/useAuthSession';
import { useCategories } from '../hooks/useCategories';
import { useDocuments } from '../hooks/useDocuments';
import { FileUpload, DocumentList, CategorySidebar } from '../components';

export function DashboardPage() {
  const { user, logout } = useAuth();
  useAuthSession(); // Initialize session management
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  // Get total document count for sidebar
  const { totalCount } = useDocuments({ 
    page: 1, 
    limit: 1 // Just get count, not actual documents
  });

  const handleLogout = () => {
    logout();
  };

  const handleUploadComplete = (uploadedFiles: any[]) => {
    console.log('Files uploaded successfully:', uploadedFiles);
    // Refresh document list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategory(categoryId);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography 
            variant="h6" 
            component="h1" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            Freehold Document Sharing
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mr: 2,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Welcome, {user?.firstName} {user?.lastName}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            aria-label="Logout from application"
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, md: 4 } }}>
          <Typography 
            variant="h4" 
            component="h2"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}
          >
            Document Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Welcome to the Freehold Document Sharing Platform.
          </Typography>
        </Paper>

        {/* Main Content with Responsive Sidebar */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 2, md: 3 },
          flexDirection: { xs: 'column', lg: 'row' }
        }}>
          {/* Sidebar - Responsive */}
          <Box sx={{ 
            width: { xs: '100%', lg: 280 }, 
            flexShrink: 0,
            order: { xs: 2, lg: 1 }
          }}>
            {categoriesLoading ? (
              <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Paper>
            ) : (
              <CategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategoryChange}
                totalDocuments={totalCount}
              />
            )}
          </Box>

          {/* Main Content */}
          <Box sx={{ 
            flexGrow: 1,
            order: { xs: 1, lg: 2 }
          }}>
            {/* Upload Section */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: { xs: 2, md: 4 } }}>
              <Typography 
                variant="h5" 
                component="h3"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                Upload Documents
              </Typography>
              
              {categoriesError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  Failed to load categories: {categoriesError}
                </Alert>
              )}
              
              {categoriesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <FileUpload 
                  categories={categories} 
                  onUploadComplete={handleUploadComplete}
                />
              )}
            </Paper>

            {/* Document List */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography 
                variant="h5" 
                component="h3"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }
                }}
              >
                {selectedCategory 
                  ? `Documents in ${categories.find(c => c.id === selectedCategory)?.name || 'Category'}`
                  : 'All Documents'
                }
              </Typography>
              
              {categoriesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DocumentList
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={handleCategoryChange}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </Paper>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}