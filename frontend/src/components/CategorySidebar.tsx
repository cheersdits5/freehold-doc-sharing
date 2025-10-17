import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Badge,
  Divider,
  Chip,
} from '@mui/material';
import {
  Folder,
  FolderOpen,
  AllInclusive,
} from '@mui/icons-material';
import { Category } from '../types/document';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory?: string | undefined;
  onCategorySelect: (categoryId: string | undefined) => void;
  totalDocuments?: number | undefined;
}

export function CategorySidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  totalDocuments = 0,
}: CategorySidebarProps) {
  const handleCategoryClick = (categoryId: string | undefined) => {
    onCategorySelect(categoryId);
  };

  return (
    <Paper elevation={1} sx={{ height: 'fit-content' }}>
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider' }}>
        <Typography 
          variant="h6" 
          component="h3"
          gutterBottom
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}
        >
          Categories
        </Typography>
      </Box>

      <List sx={{ py: 0 }} role="navigation" aria-label="Document categories">
        {/* All Documents */}
        <ListItem disablePadding>
          <ListItemButton
            selected={!selectedCategory}
            onClick={() => handleCategoryClick(undefined)}
            sx={{
              py: { xs: 1, sm: 1.5 },
              '&.Mui-selected': {
                backgroundColor: 'primary.50',
                borderRight: 3,
                borderColor: 'primary.main',
              },
            }}
            aria-label={`View all documents (${totalDocuments} total)`}
          >
            <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
              <AllInclusive color={!selectedCategory ? 'primary' : 'inherit'} />
            </ListItemIcon>
            <ListItemText
              primary="All Documents"
              primaryTypographyProps={{
                fontWeight: !selectedCategory ? 'medium' : 'normal',
                color: !selectedCategory ? 'primary.main' : 'inherit',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            />
            <Badge
              badgeContent={totalDocuments}
              color="primary"
              variant={!selectedCategory ? 'standard' : 'dot'}
            />
          </ListItemButton>
        </ListItem>

        <Divider />

        {/* Category List */}
        {categories.map((category) => (
          <ListItem key={category.id} disablePadding>
            <ListItemButton
              selected={selectedCategory === category.id}
              onClick={() => handleCategoryClick(category.id)}
              sx={{
                py: { xs: 1, sm: 1.5 },
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  borderRight: 3,
                  borderColor: 'primary.main',
                },
              }}
              aria-label={`View ${category.name} category (${category.documentCount} documents)`}
            >
              <ListItemIcon sx={{ minWidth: { xs: 36, sm: 56 } }}>
                {selectedCategory === category.id ? (
                  <FolderOpen color="primary" />
                ) : (
                  <Folder />
                )}
              </ListItemIcon>
              <ListItemText
                primary={category.name}
                secondary={category.description}
                primaryTypographyProps={{
                  fontWeight: selectedCategory === category.id ? 'medium' : 'normal',
                  color: selectedCategory === category.id ? 'primary.main' : 'inherit',
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { 
                    display: { xs: 'none', sm: '-webkit-box' },
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  },
                }}
              />
              <Box sx={{ ml: 1 }}>
                <Chip
                  label={category.documentCount}
                  size="small"
                  variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                  color={selectedCategory === category.id ? 'primary' : 'default'}
                />
              </Box>
            </ListItemButton>
          </ListItem>
        ))}

        {categories.length === 0 && (
          <ListItem>
            <ListItemText
              primary="No categories available"
              primaryTypographyProps={{
                color: 'text.secondary',
                textAlign: 'center',
              }}
            />
          </ListItem>
        )}
      </List>
    </Paper>
  );
}