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
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useAuthSession } from '../hooks/useAuthSession';
import { FileUpload, DocumentList } from '../components';

export function DashboardPage() {
  const { user, logout } = useAuth();
  useAuthSession(); // Initialize session management
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const handleLogout = () => {
    logout();
  };

  const handleUploadComplete = (uploadedFiles: any[]) => {
    console.log('Files uploaded successfully:', uploadedFiles);
    // Refresh document list with a small delay to ensure backend processing is complete
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1000);
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

        {/* Main Content */}
        <Box>
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
              
              <FileUpload 
                onUploadComplete={handleUploadComplete}
              />
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
                All Documents
              </Typography>
              
              <DocumentList
                refreshTrigger={refreshTrigger}
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
              />
            </Paper>
        </Box>
      </Container>
    </Box>
  );
}