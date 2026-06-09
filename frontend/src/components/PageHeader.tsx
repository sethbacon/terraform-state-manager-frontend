import React from 'react'
import { Box, Typography } from '@mui/material'

export interface PageHeaderProps {
  /** Page title rendered as an h4 (also the <h1> for route-focus/a11y). */
  title: React.ReactNode
  /** Optional one-line subtitle rendered below the title. */
  description?: React.ReactNode
  /** Optional page-level primary actions, right-aligned and top-aligned with the title. */
  actions?: React.ReactNode
}

/**
 * Standardised page header: a title with an optional one-line description on the
 * left and optional right-aligned actions. Wraps on small screens so actions
 * drop below the title rather than overflowing. The title is the page's <h1> so
 * RouteFocusManager can move focus to it on navigation.
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
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {description && (
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
    {actions}
  </Box>
)

export default PageHeader
