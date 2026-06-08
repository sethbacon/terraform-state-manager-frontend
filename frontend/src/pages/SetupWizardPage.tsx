import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const stepKeys = [
  'setup.stepValidateToken',
  'setup.stepConfigureOidc',
  'setup.stepTestOidc',
  'setup.stepCreateAdmin',
  'setup.stepComplete',
];

const SetupWizardPage: React.FC = () => {
  const { t } = useTranslation();
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
      setSuccess(t('setup.tokenValidated'));
      setActiveStep(1);
    } catch {
      setError(t('setup.errInvalidToken'));
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
      setSuccess(t('setup.oidcSaved'));
      setActiveStep(2);
    } catch {
      setError(t('setup.errSaveOidc'));
    }
  };

  const handleTestOIDC = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/oidc/test', {}, getAuthHeaders());
      setSuccess(t('setup.oidcTestPassed'));
      setActiveStep(3);
    } catch {
      setError(t('setup.errOidcTest'));
    }
  };

  const handleCreateAdmin = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/admin', adminConfig, getAuthHeaders());
      setSuccess(t('setup.adminCreated'));
      setActiveStep(4);
    } catch {
      setError(t('setup.errCreateAdmin'));
    }
  };

  const handleComplete = async () => {
    setError('');
    try {
      await api.post('/api/v1/setup/complete', {}, getAuthHeaders());
      setSuccess(t('setup.setupCompleted'));
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch {
      setError(t('setup.errComplete'));
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isCompleted) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Card sx={{ maxWidth: 500, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              {t('setup.alreadyCompletedTitle')}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {t('setup.alreadyCompletedText')}
            </Typography>
            <Button variant="contained" href="/login" sx={{ mt: 2 }}>
              {t('setup.goToLogin')}
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
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            {t('setup.title')}
          </Typography>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {stepKeys.map((labelKey) => (
              <Step key={labelKey}>
                <StepLabel>{t(labelKey)}</StepLabel>
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
                {t('setup.tokenIntro')}
              </Typography>
              <TextField
                fullWidth
                label={t('setup.labelSetupToken')}
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="tsm_setup_..."
              />
              <Button variant="contained" onClick={handleValidateToken} disabled={!setupToken}>
                {t('setup.validateToken')}
              </Button>
            </Stack>
          )}

          {/* Step 1: Configure OIDC */}
          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="body1">{t('setup.oidcIntro')}</Typography>
              <TextField
                fullWidth
                label={t('setup.labelProviderName')}
                value={oidcConfig.provider_name}
                onChange={(e) => setOidcConfig({ ...oidcConfig, provider_name: e.target.value })}
                placeholder={t('setup.placeholderProviderName')}
              />
              <TextField
                fullWidth
                label={t('setup.labelIssuerUrl')}
                value={oidcConfig.issuer_url}
                onChange={(e) => setOidcConfig({ ...oidcConfig, issuer_url: e.target.value })}
                placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
              />
              <TextField
                fullWidth
                label={t('setup.labelClientId')}
                value={oidcConfig.client_id}
                onChange={(e) => setOidcConfig({ ...oidcConfig, client_id: e.target.value })}
              />
              <TextField
                fullWidth
                label={t('setup.labelClientSecret')}
                type="password"
                value={oidcConfig.client_secret}
                onChange={(e) => setOidcConfig({ ...oidcConfig, client_secret: e.target.value })}
              />
              <TextField
                fullWidth
                label={t('setup.labelScopes')}
                value={oidcConfig.scopes}
                onChange={(e) => setOidcConfig({ ...oidcConfig, scopes: e.target.value })}
              />
              <Button variant="contained" onClick={handleSaveOIDC}>
                {t('setup.saveOidc')}
              </Button>
            </Stack>
          )}

          {/* Step 2: Test OIDC */}
          {activeStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                {t('setup.testIntro')}
              </Typography>
              <Button variant="contained" onClick={handleTestOIDC}>
                {t('setup.testOidc')}
              </Button>
              <Button variant="text" onClick={() => setActiveStep(3)}>
                {t('setup.skipTest')}
              </Button>
            </Stack>
          )}

          {/* Step 3: Create Admin */}
          {activeStep === 3 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                {t('setup.adminIntro')}
              </Typography>
              <TextField
                fullWidth
                label={t('setup.labelAdminEmail')}
                type="email"
                value={adminConfig.email}
                onChange={(e) => setAdminConfig({ ...adminConfig, email: e.target.value })}
              />
              <TextField
                fullWidth
                label={t('setup.labelAdminName')}
                value={adminConfig.name}
                onChange={(e) => setAdminConfig({ ...adminConfig, name: e.target.value })}
              />
              <Button variant="contained" onClick={handleCreateAdmin} disabled={!adminConfig.email || !adminConfig.name}>
                {t('setup.createAdmin')}
              </Button>
            </Stack>
          )}

          {/* Step 4: Complete */}
          {activeStep === 4 && (
            <Stack spacing={2}>
              <Typography variant="body1">
                {t('setup.completeIntro')}
              </Typography>
              <Alert severity="warning">
                {t('setup.completeWarning')}
              </Alert>
              <Button variant="contained" color="primary" onClick={handleComplete}>
                {t('setup.completeButton')}
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SetupWizardPage;
