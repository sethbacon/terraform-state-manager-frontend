import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button, Switch,
  FormControlLabel, Stack, Alert, CircularProgress, Chip,
  InputAdornment, IconButton,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../../services/api';

interface OIDCConfig {
  issuer_url: string;
  client_id: string;
  client_secret: string;
  redirect_url: string;
  scopes: string[];
  enabled: boolean;
}

const OIDCSettingsPage = () => {
  const [config, setConfig] = useState<OIDCConfig>({
    issuer_url: '', client_id: '', client_secret: '', redirect_url: '',
    scopes: ['openid', 'profile', 'email'], enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [newScope, setNewScope] = useState('');

  useEffect(() => {
    api.get('/api/v1/admin/oidc')
      .then((r: any) => setConfig(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/api/v1/admin/oidc', config);
      setSuccess('OIDC configuration saved successfully.');
    } catch {
      setError('Failed to save OIDC configuration.');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      await api.post('/api/v1/admin/oidc/test', { issuer_url: config.issuer_url, client_id: config.client_id });
      setTestResult({ ok: true, message: 'Connection successful. OIDC provider is reachable.' });
    } catch {
      setTestResult({ ok: false, message: 'Connection failed. Check issuer URL and credentials.' });
    } finally { setTesting(false); }
  };

  const addScope = () => {
    if (newScope && !config.scopes.includes(newScope)) {
      setConfig(c => ({ ...c, scopes: [...c.scopes, newScope] }));
      setNewScope('');
    }
  };

  const removeScope = (s: string) => setConfig(c => ({ ...c, scopes: c.scopes.filter(x => x !== s) }));

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>OIDC Settings</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Configure OpenID Connect authentication for single sign-on (SSO).
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {testResult && <Alert severity={testResult.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{testResult.message}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <FormControlLabel
              control={<Switch checked={config.enabled} onChange={(e) => setConfig(c => ({ ...c, enabled: e.target.checked }))} />}
              label="Enable OIDC Authentication"
            />
            <TextField label="Issuer URL" value={config.issuer_url} onChange={(e) => setConfig(c => ({ ...c, issuer_url: e.target.value }))}
              placeholder="https://accounts.google.com" fullWidth required />
            <TextField label="Client ID" value={config.client_id} onChange={(e) => setConfig(c => ({ ...c, client_id: e.target.value }))}
              fullWidth required />
            <TextField label="Client Secret" value={config.client_secret}
              onChange={(e) => setConfig(c => ({ ...c, client_secret: e.target.value }))}
              type={showSecret ? 'text' : 'password'} fullWidth
              slotProps={{ input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowSecret(s => !s)}>
                    {showSecret ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )}}} />
            <TextField label="Redirect URL" value={config.redirect_url}
              onChange={(e) => setConfig(c => ({ ...c, redirect_url: e.target.value }))}
              placeholder="https://your-app.example.com/auth/callback" fullWidth />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Scopes</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                {config.scopes.map(s => (
                  <Chip key={s} label={s} onDelete={() => removeScope(s)} size="small" />
                ))}
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField size="small" placeholder="Add scope" value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addScope(); }} />
                <Button variant="outlined" size="small" onClick={addScope}>Add</Button>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" onClick={handleTest} disabled={testing || !config.issuer_url}>
                {testing ? <CircularProgress size={20} /> : 'Test Connection'}
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OIDCSettingsPage;
