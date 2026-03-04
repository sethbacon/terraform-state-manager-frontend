import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import { AnalysisResult } from '../../types/analysis';
import StatusChip from '../StatusChip';

interface WorkspaceResultCardProps {
  result: AnalysisResult;
}

const WorkspaceResultCard: React.FC<WorkspaceResultCardProps> = ({ result }) => {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
            {result.workspace_name}
          </Typography>
          <StatusChip status={result.status} />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          {result.organization}
        </Typography>

        <Divider sx={{ my: 1 }} />

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Resources
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {result.total_resources.toLocaleString()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Managed
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {result.managed_count.toLocaleString()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              RUM
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {result.rum_count.toLocaleString()}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Data Sources
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {result.data_source_count.toLocaleString()}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={`TF ${result.terraform_version}`} size="small" variant="outlined" />
          <Chip label={result.analysis_method} size="small" variant="outlined" />
          {result.null_resource_count > 0 && (
            <Chip
              label={`${result.null_resource_count} null resources`}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        {result.error_message && (
          <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
            {result.error_message}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkspaceResultCard;
