import React, { useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import { ProviderAnalysis } from '../types/analysis';

interface ProviderAnalysisTableProps {
  providerAnalysis: ProviderAnalysis;
}

type SortField = 'provider' | 'resources';
type SortDirection = 'asc' | 'desc';

interface ProviderRow {
  provider: string;
  resourceCount: number;
}

const ProviderAnalysisTable: React.FC<ProviderAnalysisTableProps> = ({ providerAnalysis }) => {
  const [sortField, setSortField] = useState<SortField>('resources');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const rows: ProviderRow[] = useMemo(() => {
    const result: ProviderRow[] = [];
    for (const [provider, usage] of Object.entries(providerAnalysis.provider_usage)) {
      result.push({
        provider,
        resourceCount: typeof usage === 'number' ? usage : usage?.resource_count || 0,
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'provider':
          comparison = a.provider.localeCompare(b.provider);
          break;
        case 'resources':
          comparison = a.resourceCount - b.resourceCount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [providerAnalysis, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const totalResources = rows.reduce((sum, r) => sum + r.resourceCount, 0);

  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No provider analysis data available.
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Total Providers: <strong>{rows.length}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Resources: <strong>{totalResources.toLocaleString()}</strong>
          </Typography>
        </Stack>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'provider'}
                  direction={sortField === 'provider' ? sortDirection : 'asc'}
                  onClick={() => handleSort('provider')}
                >
                  Provider
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'resources'}
                  direction={sortField === 'resources' ? sortDirection : 'desc'}
                  onClick={() => handleSort('resources')}
                >
                  Resources
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">% of Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.provider} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                    {row.provider}
                  </Typography>
                </TableCell>
                <TableCell align="right">{row.resourceCount.toLocaleString()}</TableCell>
                <TableCell align="right">
                  {totalResources > 0 ? ((row.resourceCount / totalResources) * 100).toFixed(1) : '0'}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProviderAnalysisTable;
