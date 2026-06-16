import { Box, Button, List, ListItem, ListItemText, Typography } from '@mui/material'
import { useSetupWizard } from '../../../contexts/SetupWizardContext'

export default function ReviewStep() {
  const { coupled, ownerSaved, oidcSaved, sourcesSaved, completeSetup, completing } = useSetupWizard()
  // Standalone needs owner + OIDC + a source; coupled defers identity to the
  // sibling registry, so only a source is required.
  const canComplete = sourcesSaved && (coupled || (ownerSaved && oidcSaved))
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review &amp; complete
      </Typography>
      <List dense>
        {!coupled && (
          <ListItem disableGutters>
            <ListItemText primary="Owner" secondary={ownerSaved ? 'Configured' : 'Not configured'} />
          </ListItem>
        )}
        {!coupled && (
          <ListItem disableGutters>
            <ListItemText
              primary="Identity provider (OIDC)"
              secondary={oidcSaved ? 'Configured' : 'Not configured'}
            />
          </ListItem>
        )}
        <ListItem disableGutters>
          <ListItemText primary="State source" secondary={sourcesSaved ? 'Added' : 'Not added'} />
        </ListItem>
      </List>
      {coupled && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Identity is managed by the connected registry; sign-in is configured there.
        </Typography>
      )}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={completeSetup} disabled={!canComplete || completing}>
          {completing ? 'Completing…' : 'Complete setup'}
        </Button>
      </Box>
    </Box>
  )
}
