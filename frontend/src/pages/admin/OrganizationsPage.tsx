import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
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
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { Organization } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const OrganizationsPage: React.FC = () => {
  const { hasScope } = useAuth();
  const canWrite = hasScope('organizations:write');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({ name: '', display_name: '', description: '' });

  const fetchOrgs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/v1/organizations');
      setOrganizations(response.data.organizations || []);
    } catch {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleCreate = async () => {
    try {
      await api.post('/api/v1/organizations', formData);
      setDialogOpen(false);
      setFormData({ name: '', display_name: '', description: '' });
      fetchOrgs();
    } catch {
      setError('Failed to create organization');
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrg) return;
    try {
      await api.put(`/api/v1/organizations/${selectedOrg.id}`, formData);
      setDialogOpen(false);
      setSelectedOrg(null);
      setFormData({ name: '', display_name: '', description: '' });
      fetchOrgs();
    } catch {
      setError('Failed to update organization');
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    try {
      await api.delete(`/api/v1/organizations/${selectedOrg.id}`);
      setDeleteDialogOpen(false);
      setSelectedOrg(null);
      fetchOrgs();
    } catch {
      setError('Failed to delete organization');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Organizations</Typography>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => {
            setSelectedOrg(null);
            setFormData({ name: '', display_name: '', description: '' });
            setDialogOpen(true);
          }}>
            Add Organization
          </Button>
        )}
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
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  {canWrite && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 5 : 4} align="center">
                      <Typography color="text.secondary" py={2}>No organizations found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  organizations.map((org) => (
                    <TableRow key={org.id} hover>
                      <TableCell>{org.name}</TableCell>
                      <TableCell>{org.display_name}</TableCell>
                      <TableCell>
                        <Chip label={org.is_active ? 'Active' : 'Inactive'} color={org.is_active ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                      {canWrite && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => {
                              setSelectedOrg(org);
                              setFormData({ name: org.name, display_name: org.display_name, description: org.description || '' });
                              setDialogOpen(true);
                            }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => { setSelectedOrg(org); setDeleteDialogOpen(true); }} color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={{ mt: 1, mb: 2 }} disabled={!!selectedOrg} />
          <TextField fullWidth label="Display Name" value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={selectedOrg ? handleUpdate : handleCreate} disabled={!formData.name || !formData.display_name}>
            {selectedOrg ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Organization</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{selectedOrg?.display_name}</strong>? This will remove all members and data.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganizationsPage;
