import {
  Alert,
  CircularProgress,
  Collapse,
  Container,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import {
  SetupWizardProvider,
  useSetupWizard,
  STEP_AUTH,
  STEP_OWNER,
  STEP_OIDC,
  STEP_SOURCES,
  STEP_REVIEW,
} from '../contexts/SetupWizardContext'
import AuthenticateStep from './setup/steps/AuthenticateStep'
import OwnerStep from './setup/steps/OwnerStep'
import OIDCStep from './setup/steps/OIDCStep'
import SourcesStep from './setup/steps/SourcesStep'
import ReviewStep from './setup/steps/ReviewStep'

// identity steps (Owner, OIDC) are hidden in coupled mode — the sibling registry
// owns identity there.
const ALL_STEPS = [
  { index: STEP_AUTH, label: 'Authenticate', Component: AuthenticateStep, identity: false },
  { index: STEP_OWNER, label: 'Owner', Component: OwnerStep, identity: true },
  { index: STEP_OIDC, label: 'Identity provider', Component: OIDCStep, identity: true },
  { index: STEP_SOURCES, label: 'State source', Component: SourcesStep, identity: false },
  { index: STEP_REVIEW, label: 'Complete', Component: ReviewStep, identity: false },
]

function Shell() {
  const { loading, status, coupled, activeStep, error, setError, success } = useSetupWizard()

  // Once setup is complete (and no later-release feature is pending) the wizard
  // self-disables — the route renders nothing and reloadStatus has redirected.
  if (!loading && status?.setup_completed && !status?.pending_feature_setup) return null

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress aria-label="Loading setup" />
      </Container>
    )
  }

  const steps = ALL_STEPS.filter((s) => !(coupled && s.identity))
  const visualActive = Math.max(
    0,
    steps.findIndex((s) => s.index === activeStep),
  )
  const Active = ALL_STEPS.find((s) => s.index === activeStep)?.Component

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Terraform State Manager setup
        </Typography>
        <Stepper activeStep={visualActive} alternativeLabel sx={{ my: 3 }} aria-label="Setup progress">
          {steps.map((s) => (
            <Step key={s.label}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Collapse in={!!error}>
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Collapse>
        <Collapse in={!!success}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        </Collapse>
        {Active && <Active />}
      </Paper>
    </Container>
  )
}

export default function SetupWizardPage() {
  const navigate = useNavigate()
  return (
    <SetupWizardProvider
      onCompleted={() => navigate('/', { replace: true })}
      onFinalized={() => navigate('/login', { replace: true })}
    >
      <Shell />
    </SetupWizardProvider>
  )
}
