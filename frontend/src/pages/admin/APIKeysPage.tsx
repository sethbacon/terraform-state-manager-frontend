import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Refresh as RotateIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { APIKey } from '../../types';

const AVAILABLE_SCOPES = [
  'admin', 'analysis:read', 'analysis:write', 'sources:read', 'sources:write',
  'backups:read', 'backups:write', 'migrations:read', 'migrations:write',
  'reports:read', 'reports:write', 'dashboard:read', 'dashboard:write',
  'compliance:read', 'compliance:write', 'scheduler:admin', 'alerts:admin',
  'users:read', 'users:write', 'organizations:read', 'organizations:write',
];

const APIKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [newRawKey, setNewRawKey] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scopes: [] as string[],
    expires_in_days: 90,
  });

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/apikeys');
      setKeys(response.data.api_keys || []);
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    try {
      const response = await api.post('/api/v1/apikeys', formData);
      setDialogOpen(false);
      setNewRawKey(response.data.raw_key);
      setNewKeyDialogOpen(true);
      setFormData({ name: '', description: '', scopes: [], expires_in_days: 90 });
      fetchKeys();
    } catch {
      setError('Failed to create API key');
    }
  };

  const handleDelete = async () => {
    if (!selectedKey) return;
    try {
      await api.delete(`/api/v1/apikeys/${selectedKey.id}`);
      setDeleteDialogOpen(false);
      setSelectedKey(null);
      fetchKeys();
    } catch {
      setError('Failed to delete API key');
    }
  };

  const handleRotate = async (key: APIKey) => {
    try {
      const response = await api.post(`/api/v1/apikeys/${key.id}/rotate`);
      setNewRawKey(response.data.raw_key);
      setNewKeyDialogOpen(true);
      fetchKeys();
    } catch {
      setError('Failed to rotate API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">API Keys</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setFormData({ name: '', description: '', scopes: [], expires_in_days: 90 });
          setDialogOpen(true);
        }}>
          Create API Key
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Prefix</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary" py={2}>No API keys found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((key) => (
                    <TableRow key={key.id} hover>
                      <TableCell>{key.name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{key.key_prefix}...</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {key.scopes.slice(0, 3).map((s) => (
                            <Chip key={s} label={s} size="small" variant="outlined" />
                          ))}
                          {key.scopes.length > 3 && (
                            <Chip label={`+${key.scopes.length - 3}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell>
                        <Chip label={key.is_active ? 'Active' : 'Inactive'} color={key.is_active ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Rotate Key">
                          <IconButton size="small" onClick={() => handleRotate(key)}>
                            <RotateIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => { setSelectedKey(key); setDeleteDialogOpen(true); }} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={{ mb: 2 }} />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Scopes</InputLabel>
            <Select
              multiple
              value={formData.scopes}
              onChange={(e) => setFormData({ ...formData, scopes: e.target.value as string[] })}
              input={<OutlinedInput label="Scopes" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                </Box>
              )}
            >
              {AVAILABLE_SCOPES.map((scope) => (
                <MenuItem key={scope} value={scope}>{scope}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth type="number" label="Expires in (days)" value={formData.expires_in_days} onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 0 })} helperText="Set to 0 for no expiration" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!formData.name || formData.scopes.length === 0}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* New Key Display */}
      <Dialog open={newKeyDialogOpen} onClose={() => setNewKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy this key now. It will not be shown again.
          </Alert>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {newRawKey}
            </Typography>
            <Tooltip title="Copy to clipboard">
              <IconButton onClick={() => copyToClipboard(newRawKey)}>
                <CopyIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewKeyDialogOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete API key <strong>{selectedKey?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default APIKeysPage;
