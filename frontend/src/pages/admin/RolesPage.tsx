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
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { RoleTemplate } from '../../types';

const AVAILABLE_SCOPES = [
  'admin', 'analysis:read', 'analysis:write', 'sources:read', 'sources:write',
  'backups:read', 'backups:write', 'migrations:read', 'migrations:write',
  'reports:read', 'reports:write', 'dashboard:read', 'dashboard:write',
  'compliance:read', 'compliance:write', 'scheduler:admin', 'alerts:admin',
  'users:read', 'users:write', 'organizations:read', 'organizations:write',
];

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    scopes: [] as string[],
  });

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/admin/role-templates');
      const d = response.data?.role_templates;
      setRoles(Array.isArray(d) ? d : []);
    } catch {
      setError('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreate = async () => {
    try {
      await api.post('/api/v1/admin/role-templates', formData);
      setDialogOpen(false);
      setFormData({ name: '', display_name: '', description: '', scopes: [] });
      fetchRoles();
    } catch {
      setError('Failed to create role');
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    try {
      await api.put(`/api/v1/admin/role-templates/${selectedRole.id}`, formData);
      setDialogOpen(false);
      setSelectedRole(null);
      setFormData({ name: '', display_name: '', description: '', scopes: [] });
      fetchRoles();
    } catch {
      setError('Failed to update role');
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await api.delete(`/api/v1/admin/role-templates/${selectedRole.id}`);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
      fetchRoles();
    } catch {
      setError('Failed to delete role');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Role Templates</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
          setSelectedRole(null);
          setFormData({ name: '', display_name: '', description: '', scopes: [] });
          setDialogOpen(true);
        }}>
          Create Role
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
                  <TableCell>Display Name</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" py={2}>No role templates found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id} hover>
                      <TableCell>
                        <Typography fontFamily="monospace">{role.name}</Typography>
                      </TableCell>
                      <TableCell>{role.display_name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {role.scopes.slice(0, 4).map((s) => (
                            <Chip key={s} label={s} size="small" variant="outlined" />
                          ))}
                          {role.scopes.length > 4 && (
                            <Chip label={`+${role.scopes.length - 4}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={role.is_system ? 'System' : 'Custom'}
                          color={role.is_system ? 'primary' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {!role.is_system && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => {
                                setSelectedRole(role);
                                setFormData({
                                  name: role.name,
                                  display_name: role.display_name,
                                  description: role.description || '',
                                  scopes: role.scopes,
                                });
                                setDialogOpen(true);
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" onClick={() => { setSelectedRole(role); setDeleteDialogOpen(true); }} color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mt: 1, mb: 2 }} disabled={!!selectedRole} helperText="Unique identifier (e.g., 'reader', 'editor')" />
          <TextField fullWidth label="Display Name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={{ mb: 2 }} multiline rows={2} />
          <FormControl fullWidth>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={selectedRole ? handleUpdate : handleCreate} disabled={!formData.name || !formData.display_name || formData.scopes.length === 0}>
            {selectedRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete role <strong>{selectedRole?.display_name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesPage;
