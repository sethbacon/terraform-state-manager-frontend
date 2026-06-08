import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../../services/api';
import { StateSource } from '../../types/analysis';
import PageHeader from '../../components/PageHeader';
import SourceCard from '../../components/cards/SourceCard';
import SourceConfigForm from '../../components/SourceConfigForm';

const SourcesPage: React.FC = () => {
  const { t } = useTranslation();
  const [sources, setSources] = useState<StateSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<StateSource | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<StateSource | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const fetchSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/v1/sources');
      setSources(response.data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sources.errLoad');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleAddClick = useCallback(() => {
    setEditingSource(undefined);
    setFormDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((source: StateSource) => {
    setEditingSource(source);
    setFormDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((source: StateSource) => {
    setDeletingSource(source);
    setDeleteDialogOpen(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormDialogOpen(false);
    setEditingSource(undefined);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: Partial<StateSource>) => {
      setActionLoading(true);
      try {
        if (data.id) {
          await api.put(`/api/v1/sources/${data.id}`, data);
          showSnackbar(t('sources.updated'), 'success');
        } else {
          await api.post('/api/v1/sources', data);
          showSnackbar(t('sources.created'), 'success');
        }
        setFormDialogOpen(false);
        setEditingSource(undefined);
        fetchSources();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('sources.errSave');
        showSnackbar(message, 'error');
      } finally {
        setActionLoading(false);
      }
    },
    [fetchSources, showSnackbar, t]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingSource) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/v1/sources/${deletingSource.id}`);
      showSnackbar(t('sources.deleted'), 'success');
      setDeleteDialogOpen(false);
      setDeletingSource(null);
      fetchSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sources.errDelete');
      showSnackbar(message, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [deletingSource, fetchSources, showSnackbar, t]);

  const handleTestConnection = useCallback(
    async (source: StateSource) => {
      showSnackbar(t('sources.testing', { name: source.name }), 'info');
      try {
        const response = await api.post(`/api/v1/sources/${source.id}/test`);
        if (response.data.success) {
          showSnackbar(t('sources.testSuccess', { type: response.data.source_type }), 'success');
        } else {
          showSnackbar(t('sources.testFailedWithError', { error: response.data.error || t('sources.unknownError') }), 'error');
        }
        fetchSources();
      } catch (err) {
        const message = err instanceof Error ? err.message : t('sources.testFailed');
        showSnackbar(message, 'error');
      }
    },
    [fetchSources, showSnackbar, t]
  );

  return (
    <Box>
      <PageHeader
        title={t('sources.title')}
        description={t('sources.subtitle')}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSources}
              disabled={loading}
            >
              {t('sources.refresh')}
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
              {t('sources.addSource')}
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && sources.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : sources.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {t('sources.empty')}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick} sx={{ mt: 1 }}>
            {t('sources.addFirst')}
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {sources.map((source) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={source.id}>
              <SourceCard
                source={source}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onTest={handleTestConnection}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={handleFormClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingSource ? t('sources.dialogTitleEdit') : t('sources.dialogTitleAdd')}</DialogTitle>
        <DialogContent>
          <SourceConfigForm
            source={editingSource}
            onSubmit={handleFormSubmit}
            onCancel={handleFormClose}
          />
          {actionLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingSource(null);
        }}
      >
        <DialogTitle>{t('sources.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('sources.deleteConfirm', { name: deletingSource?.name ?? '' })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletingSource(null);
            }}
            disabled={actionLoading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SourcesPage;
