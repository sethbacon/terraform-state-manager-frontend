import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Search as SearchIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const UsersPage: React.FC = () => {
  const { hasScope } = useAuth();
  const canWrite = hasScope('users:write');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = search ? `/api/v1/users/search?q=${encodeURIComponent(search)}` : '/api/v1/users';
      const response = await api.get(endpoint);
      setUsers(response.data.users || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    try {
      await api.post('/api/v1/users', formData);
      setDialogOpen(false);
      setFormData({ email: '', name: '' });
      fetchUsers();
    } catch {
      setError('Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/api/v1/users/${selectedUser.id}`, formData);
      setDialogOpen(false);
      setSelectedUser(null);
      setFormData({ email: '', name: '' });
      fetchUsers();
    } catch {
      setError('Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/api/v1/users/${selectedUser.id}`);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      setError('Failed to delete user');
    }
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    setFormData({ email: '', name: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({ email: user.email, name: user.name });
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Users</Typography>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            Add User
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  {canWrite && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canWrite ? 5 : 4} align="center">
                      <Typography color="text.secondary" py={2}>
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      {canWrite && (
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEditDialog(user)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => openDeleteDialog(user)} color="error">
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={selectedUser ? handleUpdate : handleCreate}
            disabled={!formData.email || !formData.name}
          >
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
