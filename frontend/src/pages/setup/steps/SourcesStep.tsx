import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSetupWizard, STEP_REVIEW } from '../../../contexts/SetupWizardContext'

// The state-source connector types TSM supports (statesource.New).
const CONNECTORS = ['local', 's3', 'azureblob', 'gcs', 'hcp', 'git', 'consul', 'pg', 'kubernetes', 'http']

export default function SourcesStep() {
  const {
    sourceForm,
    setSourceForm,
    sourceConfigText,
    setSourceConfigText,
    testSource,
    saveSource,
    sourceTesting,
    sourceSaving,
    sourcesSaved,
    goToStep,
  } = useSetupWizard()
  const incomplete = !sourceForm.name.trim() || !sourceForm.type
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        First state source
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Connect the first Terraform state backend the State Manager will monitor.
      </Typography>
      <Stack spacing={2}>
        <TextField
          label="Name"
          value={sourceForm.name}
          onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
          fullWidth
        />
        <TextField
          select
          label="Type"
          value={sourceForm.type}
          onChange={(e) => setSourceForm({ ...sourceForm, type: e.target.value })}
          fullWidth
        >
          {CONNECTORS.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Config (JSON, optional)"
          value={sourceConfigText}
          onChange={(e) => setSourceConfigText(e.target.value)}
          placeholder='{"base_path": "/data/state"}'
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={testSource} disabled={sourceTesting || incomplete}>
          {sourceTesting ? 'Testing…' : 'Test connection'}
        </Button>
        <Button variant="outlined" onClick={saveSource} disabled={sourceSaving || incomplete}>
          {sourcesSaved ? 'Saved ✓' : sourceSaving ? 'Saving…' : 'Add source'}
        </Button>
        <Button variant="contained" onClick={() => goToStep(STEP_REVIEW)} disabled={!sourcesSaved}>
          Next
        </Button>
      </Box>
    </Box>
  )
}
