import { Box, Chip, Paper, Stack, Typography } from '@mui/material'

interface PlaceholderPageProps {
  title: string
  phase?: string
  description?: string
}

/**
 * PlaceholderPage renders the heading for a roadmap feature that has a route and
 * navigation entry but is not yet implemented. Keeps the shell navigable while the
 * project is built out phase by phase.
 */
export default function PlaceholderPage({ title, phase, description }: PlaceholderPageProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">{title}</Typography>
        {phase && <Chip label={phase} color="primary" variant="outlined" size="small" />}
      </Stack>
      {description && (
        <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 720 }}>
          {description}
        </Typography>
      )}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary">
          This feature is on the roadmap and will be implemented in {phase ?? 'a later phase'}.
        </Typography>
      </Paper>
    </Box>
  )
}
