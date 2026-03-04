import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import {
  Timer as TimerIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  PlayArrow as TriggerIcon,
} from '@mui/icons-material';
import { AnalysisRun } from '../../types/analysis';
import StatusChip from '../StatusChip';

interface AnalysisRunCardProps {
  run: AnalysisRun;
  onClick?: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}

const AnalysisRunCard: React.FC<AnalysisRunCardProps> = ({ run, onClick }) => {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={onClick} disabled={!onClick}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <StatusChip status={run.status} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(run.started_at)}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon fontSize="small" color="action" />
              <Typography variant="body2">
                Workspaces: <strong>{run.total_workspaces}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon fontSize="small" color="action" />
              <Typography variant="body2">
                RUM: <strong>{run.total_rum.toLocaleString()}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimerIcon fontSize="small" color="action" />
              <Typography variant="body2">
                Duration: <strong>{formatDuration(run.performance_ms)}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TriggerIcon fontSize="small" color="action" />
              <Typography variant="body2">
                Trigger: <strong>{run.trigger_type}</strong>
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="success.main">
              {run.successful_count} succeeded
            </Typography>
            {run.failed_count > 0 && (
              <Typography variant="caption" color="error.main">
                {run.failed_count} failed
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default AnalysisRunCard;
