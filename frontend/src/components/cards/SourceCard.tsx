import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayCircleOutline as TestIcon,
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Dns as DnsIcon,
  FolderOpen as FolderIcon,
  Http as HttpIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { StateSource, SourceType } from '../../types/analysis';

interface SourceCardProps {
  source: StateSource;
  onEdit: (source: StateSource) => void;
  onDelete: (source: StateSource) => void;
  onTest: (source: StateSource) => void;
}

const sourceTypeIcons: Record<SourceType, React.ReactElement> = {
  hcp_terraform: <CloudIcon />,
  azure_blob: <StorageIcon />,
  s3: <StorageIcon />,
  gcs: <StorageIcon />,
  consul: <DnsIcon />,
  pg: <DnsIcon />,
  kubernetes: <ComputerIcon />,
  http: <HttpIcon />,
  local: <FolderIcon />,
};

const sourceTypeLabels: Record<SourceType, string> = {
  hcp_terraform: 'HCP Terraform',
  azure_blob: 'Azure Blob',
  s3: 'AWS S3',
  gcs: 'Google Cloud Storage',
  consul: 'Consul',
  pg: 'PostgreSQL',
  kubernetes: 'Kubernetes',
  http: 'HTTP',
  local: 'Local',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

const SourceCard: React.FC<SourceCardProps> = ({ source, onEdit, onDelete, onTest }) => {
  const icon = sourceTypeIcons[source.source_type] || <StorageIcon />;
  const typeLabel = sourceTypeLabels[source.source_type] || source.source_type;

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          <Typography variant="h6" component="div" noWrap sx={{ flex: 1 }}>
            {source.name}
          </Typography>
          {source.is_active ? (
            <Chip label="Active" color="success" size="small" variant="outlined" />
          ) : (
            <Chip label="Inactive" color="default" size="small" variant="outlined" />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Type: {typeLabel}
        </Typography>

        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Last Tested: {formatDate(source.last_tested_at)}
          </Typography>
          {source.last_test_status && (
            <Chip
              label={source.last_test_status}
              color={source.last_test_status === 'success' ? 'success' : 'error'}
              size="small"
              sx={{ mt: 0.5 }}
            />
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
        <Tooltip title="Test Connection">
          <IconButton size="small" onClick={() => onTest(source)} color="primary">
            <TestIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(source)} color="default">
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete(source)} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default SourceCard;
