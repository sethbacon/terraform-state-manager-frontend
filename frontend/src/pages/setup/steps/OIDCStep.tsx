import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useSetupWizard, STEP_SOURCES } from '../../../contexts/SetupWizardContext'

export default function OIDCStep() {
  const { oidcForm, setOidcForm, testOIDC, saveOIDC, oidcTesting, oidcSaving, oidcSaved, goToStep } =
    useSetupWizard()
  const incomplete = !oidcForm.issuer_url || !oidcForm.client_id || !oidcForm.client_secret
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Identity provider (OIDC)
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Issuer URL"
          value={oidcForm.issuer_url}
          onChange={(e) => setOidcForm({ ...oidcForm, issuer_url: e.target.value })}
          placeholder="https://idp.example.com/realms/main"
          fullWidth
        />
        <TextField
          label="Client ID"
          value={oidcForm.client_id}
          onChange={(e) => setOidcForm({ ...oidcForm, client_id: e.target.value })}
          fullWidth
        />
        <TextField
          label="Client secret"
          type="password"
          value={oidcForm.client_secret}
          onChange={(e) => setOidcForm({ ...oidcForm, client_secret: e.target.value })}
          fullWidth
        />
        <TextField
          label="Redirect URL"
          value={oidcForm.redirect_url ?? ''}
          onChange={(e) => setOidcForm({ ...oidcForm, redirect_url: e.target.value })}
          helperText="Defaults to this host's /api/v1/auth/callback"
          fullWidth
        />
      </Stack>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={testOIDC} disabled={oidcTesting || !oidcForm.issuer_url}>
          {oidcTesting ? 'Testing…' : 'Test'}
        </Button>
        <Button variant="outlined" onClick={saveOIDC} disabled={oidcSaving || incomplete}>
          {oidcSaved ? 'Saved ✓' : oidcSaving ? 'Saving…' : 'Save'}
        </Button>
        <Button variant="contained" onClick={() => goToStep(STEP_SOURCES)} disabled={!oidcSaved}>
          Next
        </Button>
      </Box>
    </Box>
  )
}
