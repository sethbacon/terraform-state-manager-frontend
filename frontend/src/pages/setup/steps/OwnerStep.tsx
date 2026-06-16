import { Box, Button, TextField, Typography } from '@mui/material'
import { useSetupWizard, STEP_OIDC } from '../../../contexts/SetupWizardContext'

export default function OwnerStep() {
  const { ownerEmail, setOwnerEmail, saveOwner, ownerSaving, ownerSaved, goToStep } = useSetupWizard()
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Owner
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        The first administrator. They sign in through your identity provider; this reserves the
        email as an organization owner.
      </Typography>
      <TextField
        label="Owner email"
        type="email"
        value={ownerEmail}
        onChange={(e) => setOwnerEmail(e.target.value)}
        fullWidth
      />
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={saveOwner} disabled={ownerSaving || !ownerEmail.trim()}>
          {ownerSaved ? 'Saved ✓' : ownerSaving ? 'Saving…' : 'Create owner'}
        </Button>
        <Button variant="contained" onClick={() => goToStep(STEP_OIDC)} disabled={!ownerSaved}>
          Next
        </Button>
      </Box>
    </Box>
  )
}
