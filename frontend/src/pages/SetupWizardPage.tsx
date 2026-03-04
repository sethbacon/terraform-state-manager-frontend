import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import api from '../services/api';

const steps = ['Validate Token', 'Configure OIDC', 'Test OIDC', 'Create Admin', 'Complete'];

const SetupWizardPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [setupToken, setSetupToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // OIDC config state
  const [oidcConfig, setOidcConfig] = useState({
    provider_name: '',
    issuer_url: '',
    client_id: '',
    client_secret: '',
    scopes: 'openid,email,profile',
  });

  // Admin state
  const [adminConfig, setAdminConfig] = useState({
    email: '',
    name: '',
  });

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await api.get('/api/v1/setup/status');
      setIsCompleted(response.data.completed);
    } catch {
      // Ignore - setup status endpoint may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `SetupToken ${setupToken}` },
  });

  const handleValidateToken = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/validate-token', {}, getAuthHeaders());
      setSuccess('Token validated successfully');
      setActiveStep(1);
    } catch {
      setError('Invalid setup token');
    }
  };

  const handleSaveOIDC = async () => {
    setError('');
    try {
      await api.post(
        '/api/v1/setup/oidc',
        {
          ...oidcConfig,
          scopes: oidcConfig.scopes.split(',').map((s) => s.trim()),
        },
        getAuthHeaders()
      );
      setSuccess('OIDC configuration saved');
      setActiveStep(2);
    } catch {
      setError('Failed to save OIDC configuration');
    }
  };

  const handleTestOIDC = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/oidc/test', {}, getAuthHeaders());
      setSuccess('OIDC connection test passed');
      setActiveStep(3);
    } catch {
      setError('OIDC connection test failed. Check your configuration.');
    }
  };

  const handleCreateAdmin = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/admin', adminConfig, getAuthHeaders());
      setSuccess('Admin user created');
      setActiveStep(4);
    } catch {
      setError('Failed to create admin user');
    }
  };

  const handleComplete = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/complete', {}, getAuthHeaders());
      setSuccess('Setup completed! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch {
      setError('Failed to complete setup');
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isCompleted) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Card sx={{ maxWidth: 500, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Setup Already Completed
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              The initial setup has already been completed.
            </Typography>
            <Button variant="contained" href="/login" sx={{ mt: 2 }}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 700, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Terraform State Manager Setup
          </Typography>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Step 0: Validate Token */}
          {activeStep === 0 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                Enter the setup token from the server logs to begin configuration.
              </Typography>
              <TextField
                fullWidth
                label="Setup Token"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="tsm_setup_..."
              />
              <Button variant="contained" onClick={handleValidateToken} disabled={!setupToken}>
                Validate Token
              </Button>
            </Stack>
          )}

          {/* Step 1: Configure OIDC */}
          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body1">Configure your OIDC identity provider.</Typography>
              <TextField
                fullWidth
                label="Provider Name"
                value={oidcConfig.provider_name}
                onChange={(e) => setOidcConfig({ ...oidcConfig, provider_name: e.target.value })}
                placeholder="e.g., Azure AD, Okta, Auth0"
              />
              <TextField
                fullWidth
                label="Issuer URL"
                value={oidcConfig.issuer_url}
                onChange={(e) => setOidcConfig({ ...oidcConfig, issuer_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
              />
              <TextField
                fullWidth
                label="Client ID"
                value={oidcConfig.client_id}
                onChange={(e) => setOidcConfig({ ...oidcConfig, client_id: e.target.value })}
              />
              <TextField
                fullWidth
                label="Client Secret"
                type="password"
                value={oidcConfig.client_secret}
                onChange={(e) => setOidcConfig({ ...oidcConfig, client_secret: e.target.value })}
              />
              <TextField
                fullWidth
                label="Scopes (comma-separated)"
                value={oidcConfig.scopes}
                onChange={(e) => setOidcConfig({ ...oidcConfig, scopes: e.target.value })}
              />
              <Button variant="contained" onClick={handleSaveOIDC}>
                Save OIDC Configuration
              </Button>
            </Stack>
          )}

          {/* Step 2: Test OIDC */}
          {activeStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                Test the OIDC connection to verify your configuration is correct.
              </Typography>
              <Button variant="contained" onClick={handleTestOIDC}>
                Test OIDC Connection
              </Button>
              <Button variant="text" onClick={() => setActiveStep(3)}>
                Skip Test
              </Button>
            </Stack>
          )}

          {/* Step 3: Create Admin */}
          {activeStep === 3 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                Create the initial admin user. This user will have full access.
              </Typography>
              <TextField
                fullWidth
                label="Admin Email"
                type="email"
                value={adminConfig.email}
                onChange={(e) => setAdminConfig({ ...adminConfig, email: e.target.value })}
              />
              <TextField
                fullWidth
                label="Admin Name"
                value={adminConfig.name}
                onChange={(e) => setAdminConfig({ ...adminConfig, name: e.target.value })}
              />
              <Button variant="contained" onClick={handleCreateAdmin} disabled={!adminConfig.email || !adminConfig.name}>
                Create Admin User
              </Button>
            </Stack>
          )}

          {/* Step 4: Complete */}
          {activeStep === 4 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                Setup is ready to be finalized. Click below to complete the setup and lock the setup wizard.
              </Typography>
              <Alert severity="warning">
                After completing setup, the setup wizard will be permanently locked. You will need to use the OIDC login flow going forward.
              </Alert>
              <Button variant="contained" color="primary" onClick={handleComplete}>
                Complete Setup
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SetupWizardPage;
