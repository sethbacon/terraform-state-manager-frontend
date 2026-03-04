import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
  SelectChangeEvent,
} from '@mui/material';
import SyncAlt from '@mui/icons-material/SyncAlt';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface DevUser {
  id: string;
  email: string;
  name: string;
  primary_role: string;
}

const DevUserSwitcher = () => {
  const { user, setToken } = useAuth();
  const [devMode, setDevMode] = useState<boolean | null>(null);
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const checkDevMode = async () => {
      try {
        const response = await api.get('/api/v1/dev/status');
        const status = response.data;
        setDevMode(status.dev_mode);
        if (status.dev_mode) {
          const usersResponse = await api.get('/api/v1/dev/users');
          setUsers(usersResponse.data.users || []);
        }
      } catch {
        setDevMode(false);
      } finally {
        setLoading(false);
      }
    };
    checkDevMode();
  }, []);

  const handleUserSwitch = async (event: SelectChangeEvent<string>) => {
    const targetUserId = event.target.value;
    if (!targetUserId || targetUserId === user?.id) return;

    setSwitching(true);
    try {
      const response = await api.post(`/api/v1/dev/impersonate/${targetUserId}`);
      const result = response.data;
      setToken(result.token);
      window.location.reload();
    } catch (error) {
      console.error('Failed to impersonate user:', error);
    } finally {
      setSwitching(false);
    }
  };

  if (devMode === null || loading) return null;
  if (!devMode) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
      <Tooltip title="Development Mode: Switch User">
        <Chip
          icon={<SyncAlt />}
          label="DEV"
          size="small"
          color="warning"
          sx={{ mr: 1 }}
        />
      </Tooltip>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          value={users.some(u => u.id === user?.id) ? user?.id : ''}
          onChange={handleUserSwitch}
          displayEmpty
          disabled={switching}
          sx={{
            bgcolor: 'background.paper',
            '& .MuiSelect-select': { py: 0.5, display: 'flex', alignItems: 'center' },
          }}
          renderValue={(selected) => {
            if (switching) {
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Switching...</Typography>
                </Box>
              );
            }
            const selectedUser = users.find((u) => u.id === selected);
            if (!selectedUser) return <Typography variant="body2">Select user</Typography>;
            return (
              <Box>
                <Typography variant="body2" component="span">{selectedUser.name || selectedUser.email}</Typography>
                <Typography variant="caption" component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                  ({selectedUser.primary_role})
                </Typography>
              </Box>
            );
          }}
        >
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{u.name || u.email}</Typography>
                <Typography variant="caption" color="text.secondary">{u.email} - {u.primary_role}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default DevUserSwitcher;
