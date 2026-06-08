import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Alert as MuiAlert,
  CircularProgress,
  Chip,
  Tooltip,
  Stack,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TriggerIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

// --- Types ---

interface ScheduledTask {
  id: string;
  name: string;
  task_type: TaskType;
  schedule: string;
  config: Record<string, unknown>;
  is_active: boolean;
  source_id?: string;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Source {
  id: string;
  name: string;
}

const TASK_TYPES = [
  'analysis',
  'snapshot',
  'report',
  'backup',
  'retention_cleanup',
] as const;

type TaskType = (typeof TASK_TYPES)[number];

const taskTypeLabel = (type: TaskType, t: TFunction): string =>
  t(`scheduler.taskType.${type}`);

const TASK_TYPE_COLORS: Record<TaskType, 'primary' | 'secondary' | 'info' | 'warning' | 'success'> = {
  analysis: 'primary',
  snapshot: 'info',
  report: 'secondary',
  backup: 'warning',
  retention_cleanup: 'success',
};

/** Task types that require a source to be selected. */
const SOURCE_REQUIRED_TYPES: TaskType[] = ['analysis', 'backup', 'snapshot'];

interface CronPreset {
  labelKey: string;
  expression: string;
}

const CRON_PRESETS: CronPreset[] = [
  { labelKey: 'scheduler.cronPreset.everyHour', expression: '0 * * * *' },
  { labelKey: 'scheduler.cronPreset.dailyMidnight', expression: '0 0 * * *' },
  { labelKey: 'scheduler.cronPreset.weeklyMonday', expression: '0 0 * * 1' },
  { labelKey: 'scheduler.cronPreset.every6Hours', expression: '0 */6 * * *' },
];

interface TaskFormState {
  name: string;
  task_type: TaskType;
  schedule: string;
  config: string;
  is_active: boolean;
  source_id: string;
}

const defaultForm: TaskFormState = {
  name: '',
  task_type: 'analysis',
  schedule: '0 0 * * *',
  config: '{}',
  is_active: true,
  source_id: '',
};

// --- Helpers ---

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm');
  } catch {
    return value;
  }
}

function describeSchedule(expression: string, t: TFunction): string {
  const preset = CRON_PRESETS.find((p) => p.expression === expression);
  if (preset) return t(preset.labelKey);
  return expression;
}

function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

// --- Component ---

const SchedulerPage: React.FC = () => {
  const { t } = useTranslation();
  // Task list
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sources (for the source selector in the dialog)
  const [sources, setSources] = useState<Source[]>([]);

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [form, setForm] = useState<TaskFormState>({ ...defaultForm });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<ScheduledTask | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = useCallback(
    (message: string, severity: 'success' | 'error' | 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    [],
  );

  // --- Data fetching ---

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listScheduledTasks();
      const list = data?.data ?? data;
      setTasks(Array.isArray(list) ? list : []);
    } catch {
      setError(t('scheduler.errLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSources = useCallback(async () => {
    try {
      const data = await api.listSources();
      const list = data?.data ?? data;
      setSources(Array.isArray(list) ? list : []);
    } catch {
      // Silently fail -- sources are optional context
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchSources();
  }, [fetchTasks, fetchSources]);

  // --- Create / Edit handlers ---

  const handleOpenCreate = useCallback(() => {
    setEditingTask(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((task: ScheduledTask) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      task_type: task.task_type,
      schedule: task.schedule,
      config: JSON.stringify(task.config ?? {}, null, 2),
      is_active: task.is_active,
      source_id: task.source_id ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingTask(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValidJson(form.config)) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        task_type: form.task_type,
        schedule: form.schedule,
        config: JSON.parse(form.config),
        is_active: form.is_active,
      };
      if (SOURCE_REQUIRED_TYPES.includes(form.task_type) && form.source_id) {
        payload.source_id = form.source_id;
      }

      if (editingTask) {
        await api.updateScheduledTask(editingTask.id, payload);
        showSnackbar(t('scheduler.taskUpdated'), 'success');
      } else {
        await api.createScheduledTask(payload);
        showSnackbar(t('scheduler.taskCreated'), 'success');
      }
      setDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch {
      showSnackbar(
        editingTask ? t('scheduler.errUpdate') : t('scheduler.errCreate'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, editingTask, fetchTasks, showSnackbar, t]);

  // --- Delete handlers ---

  const handleOpenDelete = useCallback((task: ScheduledTask) => {
    setDeletingTask(task);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingTask(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingTask) return;
    try {
      await api.deleteScheduledTask(deletingTask.id);
      showSnackbar(t('scheduler.taskDeleted'), 'success');
      setDeleteDialogOpen(false);
      setDeletingTask(null);
      fetchTasks();
    } catch {
      showSnackbar(t('scheduler.errDelete'), 'error');
    }
  }, [deletingTask, fetchTasks, showSnackbar, t]);

  // --- Trigger Now handler ---

  const handleTriggerNow = useCallback(
    async (task: ScheduledTask) => {
      showSnackbar(t('scheduler.triggering', { name: task.name }), 'info');
      try {
        await api.triggerScheduledTask(task.id);
        showSnackbar(t('scheduler.triggered', { name: task.name }), 'success');
        fetchTasks();
      } catch {
        showSnackbar(t('scheduler.errTrigger', { name: task.name }), 'error');
      }
    },
    [fetchTasks, showSnackbar, t],
  );

  // --- Form field updater ---

  const updateField = useCallback(
    <K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // --- Derived ---

  const isFormValid = useCallback((): boolean => {
    if (!form.name.trim()) return false;
    if (!form.schedule.trim()) return false;
    if (!isValidJson(form.config)) return false;
    if (SOURCE_REQUIRED_TYPES.includes(form.task_type) && !form.source_id) return false;
    return true;
  }, [form]);

  const showSourceSelector = SOURCE_REQUIRED_TYPES.includes(form.task_type);

  // --- Render ---

  return (
    <Box>
      {/* Header */}
      <PageHeader
        title={t('scheduler.title')}
        description={t('scheduler.subtitle')}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            {t('scheduler.createTask')}
          </Button>
        }
      />

      {/* Error banner */}
      {error && (
        <MuiAlert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </MuiAlert>
      )}

      {/* Tasks table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('scheduler.thName')}</TableCell>
                <TableCell>{t('scheduler.thType')}</TableCell>
                <TableCell>{t('scheduler.thSchedule')}</TableCell>
                <TableCell>{t('scheduler.thNextRun')}</TableCell>
                <TableCell>{t('scheduler.thLastRun')}</TableCell>
                <TableCell>{t('scheduler.thStatus')}</TableCell>
                <TableCell align="right">{t('scheduler.thActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      {t('scheduler.empty')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {task.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={taskTypeLabel(task.task_type, t) ?? task.task_type}
                        color={TASK_TYPE_COLORS[task.task_type] ?? 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={task.schedule}>
                        <Typography variant="body2">
                          {describeSchedule(task.schedule, t)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDateTime(task.next_run_at)}</TableCell>
                    <TableCell>{formatDateTime(task.last_run_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={task.is_active ? t('scheduler.active') : t('scheduler.inactive')}
                        color={task.is_active ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('scheduler.tooltipTrigger')}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleTriggerNow(task)}
                        >
                          <TriggerIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('scheduler.tooltipEdit')}>
                        <IconButton size="small" onClick={() => handleOpenEdit(task)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('scheduler.tooltipDelete')}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDelete(task)}
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
      </Paper>

      {/* ---- Create / Edit Task Dialog ---- */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTask ? t('scheduler.dialogTitleEdit') : t('scheduler.dialogTitleCreate')}</DialogTitle>
        <DialogContent>
          {/* Name */}
          <TextField
            fullWidth
            label={t('scheduler.labelName')}
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />

          {/* Task Type */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('scheduler.labelTaskType')}</InputLabel>
            <Select
              value={form.task_type}
              label={t('scheduler.labelTaskType')}
              onChange={(e) => updateField('task_type', e.target.value as TaskType)}
            >
              {TASK_TYPES.map((tt) => (
                <MenuItem key={tt} value={tt}>
                  {taskTypeLabel(tt, t)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Schedule -- preset buttons */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('scheduler.scheduleHeading')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap" }}>
            {CRON_PRESETS.map((preset) => (
              <Button
                key={preset.expression}
                size="small"
                variant={form.schedule === preset.expression ? 'contained' : 'outlined'}
                onClick={() => updateField('schedule', preset.expression)}
              >
                {t(preset.labelKey)}
              </Button>
            ))}
          </Stack>

          {/* Schedule -- raw cron input */}
          <TextField
            fullWidth
            label={t('scheduler.labelCronExpression')}
            value={form.schedule}
            onChange={(e) => updateField('schedule', e.target.value)}
            placeholder="* * * * *"
            helperText={
              form.schedule.trim()
                ? t('scheduler.scheduleHelper', { schedule: describeSchedule(form.schedule, t) })
                : t('scheduler.cronHelperEmpty')
            }
            sx={{ mb: 1 }}
          />

          {/* Next 3 runs placeholder */}
          {form.schedule.trim() && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t('scheduler.nextRunsNote')}
            </Typography>
          )}

          {/* Source selector (conditional) */}
          {showSourceSelector && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('scheduler.labelSource')}</InputLabel>
              <Select
                value={form.source_id}
                label={t('scheduler.labelSource')}
                onChange={(e) => updateField('source_id', e.target.value as string)}
              >
                <MenuItem value="">
                  <em>{t('scheduler.selectSource')}</em>
                </MenuItem>
                {sources.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Config JSON */}
          <TextField
            fullWidth
            label={t('scheduler.labelConfig')}
            value={form.config}
            onChange={(e) => updateField('config', e.target.value)}
            multiline
            rows={4}
            error={!isValidJson(form.config)}
            helperText={!isValidJson(form.config) ? t('scheduler.invalidJson') : ''}
            sx={{ mb: 2 }}
          />

          {/* Active toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) => updateField('is_active', e.target.checked)}
              />
            }
            label={t('scheduler.active')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isFormValid() || submitting}
          >
            {submitting ? (
              <CircularProgress size={20} />
            ) : editingTask ? (
              t('scheduler.update')
            ) : (
              t('scheduler.create')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDelete}>
        <DialogTitle>{t('scheduler.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('scheduler.deleteConfirm', { name: deletingTask?.name ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Snackbar ---- */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default SchedulerPage;
