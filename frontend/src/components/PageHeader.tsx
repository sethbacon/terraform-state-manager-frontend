import React from 'react';
import { Box, Typography } from '@mui/material';

export interface PageHeaderProps {
  /** Page title rendered as an h4. */
  title: React.ReactNode;
  /** Optional one-line subtitle rendered below the title. */
  description?: React.ReactNode;
  /** Optional page-level primary actions, right-aligned and top-aligned with the title. */
  actions?: React.ReactNode;
}

/**
 * Standardised page header: an h4 title with an optional one-line description
 * on the left, and optional right-aligned actions. The row wraps on small
 * screens so actions drop below the title rather than overflowing.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: 2,
      mb: 3,
    }}
  >
    <Box>
      <Typography variant="h4">{title}</Typography>
      {description && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
    {actions}
  </Box>
);

export default PageHeader;
