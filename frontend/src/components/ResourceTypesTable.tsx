import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface ResourceTypesTableProps {
  resourcesByType: Record<string, number>;
}

type SortDirection = 'asc' | 'desc';
type SortField = 'type' | 'count' | 'percentage';

const DEFAULT_DISPLAY_LIMIT = 20;

const ResourceTypesTable: React.FC<ResourceTypesTableProps> = ({ resourcesByType }) => {
  const [showAll, setShowAll] = useState(false);
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filter, setFilter] = useState('');

  const totalCount = useMemo(
    () => Object.values(resourcesByType).reduce((sum, count) => sum + count, 0),
    [resourcesByType]
  );

  const sortedEntries = useMemo(() => {
    const entries = Object.entries(resourcesByType).map(([type, count]) => ({
      type,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
    }));

    entries.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'percentage':
          comparison = a.percentage - b.percentage;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return entries;
  }, [resourcesByType, totalCount, sortField, sortDirection]);

  const filteredEntries = useMemo(() => {
    if (!filter) return sortedEntries;
    const lowerFilter = filter.toLowerCase();
    return sortedEntries.filter((e) => e.type.toLowerCase().includes(lowerFilter));
  }, [sortedEntries, filter]);

  const displayedEntries = showAll
    ? filteredEntries
    : filteredEntries.slice(0, DEFAULT_DISPLAY_LIMIT);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (Object.keys(resourcesByType).length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No resource type data available.
      </Typography>
    );
  }

  return (
    <Box>
      <TextField
        size="small"
        placeholder="Filter resource types..."
        value={filter}
        onChange={(e) => { setFilter(e.target.value); setShowAll(false); }}
        sx={{ mb: 2, width: 300 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
          ),
        }}
      />
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'type'}
                  direction={sortField === 'type' ? sortDirection : 'asc'}
                  onClick={() => handleSort('type')}
                >
                  Resource Type
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'count'}
                  direction={sortField === 'count' ? sortDirection : 'desc'}
                  onClick={() => handleSort('count')}
                >
                  Count
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortField === 'percentage'}
                  direction={sortField === 'percentage' ? sortDirection : 'desc'}
                  onClick={() => handleSort('percentage')}
                >
                  Percentage
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedEntries.map((entry) => (
              <TableRow key={entry.type} hover>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {entry.type}
                  </Typography>
                </TableCell>
                <TableCell align="right">{entry.count.toLocaleString()}</TableCell>
                <TableCell align="right">{entry.percentage.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredEntries.length > DEFAULT_DISPLAY_LIMIT && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button size="small" onClick={() => setShowAll((prev) => !prev)}>
            {showAll
              ? 'Show Top 20'
              : `Show All (${filteredEntries.length} types)`}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ResourceTypesTable;
