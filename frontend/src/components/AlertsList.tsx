import React from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Select,
  MenuItem,
  TablePagination,
  Alert as MuiAlert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
} from '@mui/material';
import { CheckCircle as AckIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import type { Alert } from '../types/alerts';

interface AlertsListProps {
  alerts: Alert[];
  loading: boolean;
  error: string;
  total: number;
  page: number;
  rowsPerPage: number;
  severityFilter: string;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSeverityFilterChange: (value: string) => void;
  onAcknowledge: (alertId: string) => void;
  onClearError: () => void;
}

const severityColor = (severity: string): 'info' | 'warning' | 'error' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
};

const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  loading,
  error,
  total,
  page,
  rowsPerPage,
  severityFilter,
  onPageChange,
  onRowsPerPageChange,
  onSeverityFilterChange,
  onAcknowledge,
  onClearError,
}) => {
  return (
    <Box>
      {error && (
        <MuiAlert severity="error" onClose={onClearError} sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            label="Severity"
            onChange={(e) => onSeverityFilterChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Severity</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Workspace</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No alerts found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((alert) => (
                  <TableRow key={alert.id} hover>
                    <TableCell>
                      <Chip
                        label={alert.severity}
                        color={severityColor(alert.severity)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{alert.workspace_name}</TableCell>
                    <TableCell>
                      {format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {alert.is_acknowledged ? (
                        <Chip
                          label="Acknowledged"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip label="Open" color="warning" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {!alert.is_acknowledged && (
                        <Tooltip title="Acknowledge">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onAcknowledge(alert.id)}
                          >
                            <AckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && alerts.length > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25]}
          />
        )}
      </Paper>
    </Box>
  );
};

export default AlertsList;
