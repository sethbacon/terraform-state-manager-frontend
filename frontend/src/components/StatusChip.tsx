import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status: string;
  size?: 'small' | 'medium';
}

const statusColorMap: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  completed: 'success',
  success: 'success',
  active: 'success',
  failed: 'error',
  error: 'error',
  cancelled: 'warning',
  running: 'info',
  in_progress: 'info',
  pending: 'default',
};

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const color = statusColorMap[status.toLowerCase()] || 'default';
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return <Chip label={label} color={color} size={size} variant="filled" />;
};

export default StatusChip;
