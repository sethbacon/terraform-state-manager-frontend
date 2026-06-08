import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../services/api';
import ReportGenerateDialog from '../components/ReportGenerateDialog';
import type { Report, GenerateReportRequest } from '../types/dashboard';
import type { AnalysisRun } from '../types/analysis';

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysisRuns, setAnalysisRuns] = useState<AnalysisRun[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const resolveUsers = useCallback(async (reportList: Report[]) => {
    const ids = [...new Set(reportList.map((r) => r.generated_by).filter(Boolean))] as string[];
    if (ids.length === 0) return;
    const settled = await Promise.allSettled(
      ids.map((id) => api.getUser(id))
    );
    const resolved: Record<string, string> = {};
    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      if (result.status === 'fulfilled') {
        const user = result.value?.user ?? result.value;
        resolved[ids[i]] = user?.name || user?.email || ids[i];
      }
    }
    setUserNames((prev) => ({ ...prev, ...resolved }));
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/v1/reports', {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      const data = response.data;
      const reportList: Report[] = data.data ?? [];
      setReports(reportList);
      setTotal(data.total ?? 0);
      resolveUsers(reportList);
    } catch {
      setError(t('reports.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, resolveUsers, t]);

  const fetchAnalysisRuns = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/analysis/runs', {
        limit: 50, offset: 0,
      });
      const data = response.data;
      setAnalysisRuns(
        (data.data ?? []).filter((run: AnalysisRun) => run.status === 'completed')
      );
    } catch {
      // Silently fail - dialog will show empty list
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async (request: GenerateReportRequest) => {
    setGenerating(true);
    try {
      await api.post('/api/v1/reports/generate', request);
      setDialogOpen(false);
      fetchReports();
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const response = await api.downloadReport(report.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = report.name || `report.${report.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError(t('reports.errDownload'));
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      await api.delete(`/api/v1/reports/${reportId}`);
      fetchReports();
    } catch {
      setError(t('reports.errDelete'));
    }
  };

  const handleOpenDialog = () => {
    fetchAnalysisRuns();
    setDialogOpen(true);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatChip = (fmt: string) => {
    const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'info'> = {
      markdown: 'primary',
      json: 'info',
      csv: 'success',
    };
    return (
      <Chip
        label={fmt.toUpperCase()}
        size="small"
        color={colorMap[fmt] ?? 'secondary'}
        variant="outlined"
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">{t('reports.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          {t('reports.generate')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('reports.thName')}</TableCell>
                <TableCell>{t('reports.thFormat')}</TableCell>
                <TableCell>{t('reports.thSize')}</TableCell>
                <TableCell>{t('reports.thCreated')}</TableCell>
                <TableCell>{t('reports.thGeneratedBy')}</TableCell>
                <TableCell align="right">{t('reports.thActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      {t('reports.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatChip(report.format)}</TableCell>
                    <TableCell>{formatFileSize(report.file_size_bytes)}</TableCell>
                    <TableCell>
                      {format(new Date(report.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {report.generated_by
                          ? (userNames[report.generated_by] ?? report.generated_by)
                          : '--'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('reports.tooltipDownload')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(report)}
                          color="primary"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('reports.tooltipDelete')}>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(report.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {!loading && reports.length > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        )}
      </Paper>

      <ReportGenerateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerate={handleGenerate}
        analysisRuns={analysisRuns}
        loading={generating}
      />
    </Box>
  );
};

export default ReportsPage;
