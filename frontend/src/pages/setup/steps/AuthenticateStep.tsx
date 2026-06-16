import { Box, Button, TextField, Typography } from '@mui/material'
import { useSetupWizard } from '../../../contexts/SetupWizardContext'

export default function AuthenticateStep() {
  const { setupToken, setSetupToken, validateToken, validating } = useSetupWizard()
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Authenticate
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Paste the setup token printed in the server logs when the State Manager first started.
      </Typography>
      <TextField
        label="Setup token"
        type="password"
        value={setupToken}
        onChange={(e) => setSetupToken(e.target.value)}
        fullWidth
        autoFocus
      />
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={validateToken}
          disabled={validating || !setupToken.trim()}
        >
          {validating ? 'Verifying…' : 'Continue'}
        </Button>
      </Box>
    </Box>
  )
}
