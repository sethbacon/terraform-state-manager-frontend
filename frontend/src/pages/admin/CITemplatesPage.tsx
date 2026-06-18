import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PageHeader from '../../components/PageHeader'
import { api, type CITemplate } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'

// Mirrors the server-side CHECK on workflow_templates.profile.
const PROFILE_RE = /^[A-Za-z0-9._-]+$/

const emptyForm = { provider: 'azure_devops', kind: 'drift', profile: '', name: '', description: '', content: '' }

export default function CITemplatesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<CITemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CITemplate | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const templatesQuery = useQuery({ queryKey: queryKeys.admin.ciTemplates(), queryFn: api.listCITemplates })
  const templates = templatesQuery.data ?? []

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.ciTemplates() })

  const handleOpenDialog = (tmpl?: CITemplate) => {
    if (tmpl) {
      setEditing(tmpl)
      setFormData({
        provider: tmpl.provider,
        kind: tmpl.kind,
        profile: tmpl.profile,
        name: tmpl.name,
        description: tmpl.description,
        content: tmpl.content,
      })
    } else {
      setEditing(null)
      setFormData(emptyForm)
    }
    setError(null)
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditing(null)
    setError(null)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.updateCITemplate(editing.id, {
          name: formData.name,
          description: formData.description,
          content: formData.content,
        })
      } else {
        await api.createCITemplate({
          provider: formData.provider,
          kind: formData.kind,
          profile: formData.profile,
          name: formData.name,
          description: formData.description,
          content: formData.content,
        })
      }
    },
    onSuccess: () => {
      handleCloseDialog()
      invalidate()
    },
    onError: () => setError(t('pages.ciTemplates.errSave')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCITemplate(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setError(null)
      invalidate()
    },
    onError: () => setError(t('pages.ciTemplates.errDelete')),
  })

  const handleSave = () => {
    setError(null)
    if (!editing && !PROFILE_RE.test(formData.profile)) {
      setError(t('pages.ciTemplates.errProfile'))
      return
    }
    saveMutation.mutate()
  }

  const saveDisabled =
    !formData.name.trim() ||
    !formData.content.trim() ||
    (!editing && !formData.profile.trim()) ||
    saveMutation.isPending

  return (
    <Box>
      <PageHeader
        title={t('pages.ciTemplates.pageTitle')}
        description={t('pages.ciTemplates.pageSubtitle')}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('pages.ciTemplates.addTemplate')}
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined">
        {templatesQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        ) : templates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: 'text.secondary' }}>{t('pages.ciTemplates.emptyState')}</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2 }}>
              {t('pages.ciTemplates.createFirst')}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('pages.ciTemplates.thProvider')}</TableCell>
                  <TableCell>{t('pages.ciTemplates.thKind')}</TableCell>
                  <TableCell>{t('pages.ciTemplates.thProfile')}</TableCell>
                  <TableCell>{t('pages.ciTemplates.thName')}</TableCell>
                  <TableCell align="right">{t('pages.ciTemplates.thActions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((tmpl) => (
                  <TableRow key={tmpl.id}>
                    <TableCell>{tmpl.provider}</TableCell>
                    <TableCell>{tmpl.kind}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 'medium' }}>{tmpl.profile}</Typography>
                        {tmpl.is_builtin && <Chip label={t('pages.ciTemplates.builtinChip')} size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>{tmpl.name}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('pages.ciTemplates.tooltipEdit')}>
                        <IconButton
                          size="small"
                          aria-label={t('pages.ciTemplates.ariaEdit')}
                          onClick={() => handleOpenDialog(tmpl)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          tmpl.is_builtin ? t('pages.ciTemplates.builtinNoDelete') : t('pages.ciTemplates.tooltipDelete')
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            aria-label={t('pages.ciTemplates.ariaDelete')}
                            onClick={() => setDeleteTarget(tmpl)}
                            color="error"
                            disabled={tmpl.is_builtin}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? t('pages.ciTemplates.dialogTitleEdit') : t('pages.ciTemplates.dialogTitleAdd')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth disabled={Boolean(editing)}>
                <InputLabel>{t('pages.ciTemplates.labelProvider')}</InputLabel>
                <Select
                  value={formData.provider}
                  label={t('pages.ciTemplates.labelProvider')}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, provider: e.target.value })}
                >
                  <MenuItem value="azure_devops">azure_devops</MenuItem>
                  <MenuItem value="github_actions">github_actions</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={Boolean(editing)}>
                <InputLabel>{t('pages.ciTemplates.labelKind')}</InputLabel>
                <Select
                  value={formData.kind}
                  label={t('pages.ciTemplates.labelKind')}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, kind: e.target.value })}
                >
                  <MenuItem value="drift">drift</MenuItem>
                  <MenuItem value="versionlab">versionlab</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={t('pages.ciTemplates.labelProfile')}
                value={formData.profile}
                onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                disabled={Boolean(editing)}
                required
                fullWidth
                error={!editing && !!formData.profile && !PROFILE_RE.test(formData.profile)}
                helperText={t('pages.ciTemplates.helpProfile')}
              />
            </Stack>
            <TextField
              label={t('pages.ciTemplates.labelName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label={t('pages.ciTemplates.labelDescription')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('pages.ciTemplates.labelContent')}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              fullWidth
              multiline
              minRows={10}
              maxRows={22}
              sx={{ '& textarea': { fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('pages.ciTemplates.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" disabled={saveDisabled}>
            {editing ? t('pages.ciTemplates.save') : t('pages.ciTemplates.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('pages.ciTemplates.dialogTitleDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('pages.ciTemplates.confirmDelete', { name: deleteTarget?.name })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('pages.ciTemplates.cancel')}</Button>
          <Button
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            color="error"
            variant="contained"
          >
            {t('pages.ciTemplates.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
