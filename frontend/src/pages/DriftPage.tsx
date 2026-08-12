import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import HubIcon from '@mui/icons-material/Hub'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import { Trans, useTranslation } from 'react-i18next'
import { api, type PipelineConnection } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import DriftRecordsSection from '../components/DriftRecordsSection'
import DriftRepoWizard from '../components/DriftRepoWizard'
import PageHeader from '../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/CompareArrows'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import AddPipelineDialog from './drift/AddPipelineDialog'
import CISourcesDialog from './drift/CISourcesDialog'
import DriftRunsTable from './drift/DriftRunsTable'
import EditPipelineDialog from './drift/EditPipelineDialog'
import NewRunDialog from './drift/NewRunDialog'
import WorkflowDialog from './drift/WorkflowDialog'

// Composition root for /drift. It owns the pipeline-connection list — the card
// grid, which connection is being edited or deleted, and the dialogs those
// buttons open. The drift records section, the runs table and each dialog fetch
// their own data; the pipelines query stays here because both the card grid and
// the new-run button read it.
export default function DriftPage() {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const canManage = hasScope('sources:manage')
  const canRun = hasScope('state:drift')

  const [addPipelineOpen, setAddPipelineOpen] = useState(false)
  const [ciSourcesOpen, setCiSourcesOpen] = useState(false)
  const [repoWizardOpen, setRepoWizardOpen] = useState(false)
  const [newRunOpen, setNewRunOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [deletePipelineTarget, setDeletePipelineTarget] = useState<PipelineConnection | null>(null)
  const [editPipelineTarget, setEditPipelineTarget] = useState<PipelineConnection | null>(null)

  const pipelinesQuery = useQuery({ queryKey: queryKeys.pipelines.list(), queryFn: api.listPipelines })

  // Source names label drift records (records key off source_id + state_key).
  const sourcesQuery = useQuery({ queryKey: queryKeys.sources.list(), queryFn: api.listSources })
  const sourceNames = Object.fromEntries((sourcesQuery.data ?? []).map((s) => [s.id, s.name]))

  const deletePipeline = useMutation({
    mutationFn: api.deletePipeline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
  })

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('nav.drift')}
        description={t('help.pages.drift.body')}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => setWorkflowOpen(true)}>
              {t('actions.workflowTemplate')}
            </Button>
            {canRun && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                disabled={!pipelinesQuery.data?.length}
                onClick={() => setNewRunOpen(true)}
              >
                {t('actions.newDriftRun')}
              </Button>
            )}
          </Stack>
        }
      />

      {/* Drift records: the durable, acknowledgeable signal (runs are the mechanism) */}
      <DriftRecordsSection sourceNames={sourceNames} />

      {/* Pipeline connections */}
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('pages.drift.pipelines')}
        </Typography>
        {canManage && (
          <>
            <Button size="small" startIcon={<AutoFixHighIcon />} onClick={() => setRepoWizardOpen(true)} sx={{ mr: 1 }}>
              {t('pages.drift.setUpRepo')}
            </Button>
            <Button size="small" startIcon={<HubIcon />} onClick={() => setCiSourcesOpen(true)} sx={{ mr: 1 }}>
              {t('pages.drift.ciSources')}
            </Button>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddPipelineOpen(true)}>
              {t('actions.addPipeline')}
            </Button>
          </>
        )}
      </Stack>
      {pipelinesQuery.isLoading && <CircularProgress size={20} />}
      {/* Divergence, preserved: this empty state is hard-coded English while
          the neighbouring no-runs and no-CI-sources hints are translated. */}
      {pipelinesQuery.data && pipelinesQuery.data.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No pipeline connections yet.
        </Alert>
      )}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', mb: 4 }}>
        {pipelinesQuery.data?.map((p) => (
          <Card key={p.id} variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1, wordBreak: 'break-word' }}>
                  {p.name}
                </Typography>
                {canManage && (
                  <Stack direction="row" sx={{ flexShrink: 0, mt: -0.5, mr: -0.5 }}>
                    <IconButton size="small" aria-label="edit" onClick={() => setEditPipelineTarget(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="delete" onClick={() => setDeletePipelineTarget(p)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Stack>
              <Chip size="small" label={p.provider} sx={{ mt: 0.5 }} />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Drift runs */}
      <DriftRunsTable />

      <AddPipelineDialog
        open={addPipelineOpen}
        onClose={() => setAddPipelineOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
          setAddPipelineOpen(false)
        }}
      />
      <EditPipelineDialog
        pipeline={editPipelineTarget}
        onClose={() => setEditPipelineTarget(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
          setEditPipelineTarget(null)
        }}
      />
      <CISourcesDialog open={ciSourcesOpen} onClose={() => setCiSourcesOpen(false)} />
      <DriftRepoWizard
        open={repoWizardOpen}
        onClose={() => setRepoWizardOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all })
          // The wizard may have dispatched a first run — surface it in the table.
          queryClient.invalidateQueries({ queryKey: queryKeys.drift.all })
        }}
      />
      <NewRunDialog
        open={newRunOpen}
        onClose={() => setNewRunOpen(false)}
        pipelines={pipelinesQuery.data ?? []}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.drift.all })
          setNewRunOpen(false)
        }}
      />
      <WorkflowDialog open={workflowOpen} onClose={() => setWorkflowOpen(false)} />

      <ConfirmDialog
        open={Boolean(deletePipelineTarget)}
        onClose={() => setDeletePipelineTarget(null)}
        title={t('pages.drift.deletePipelineTitle')}
        severity="error"
        description={
          <>
            <Trans i18nKey="pages.drift.deletePipelineBody" values={{ name: deletePipelineTarget?.name }} components={{ 1: <b /> }} />
          </>
        }
        confirmLabel={t('common.delete')}
        loading={deletePipeline.isPending}
        onConfirm={async () => {
          if (!deletePipelineTarget) return
          await deletePipeline.mutateAsync(deletePipelineTarget.id)
          setDeletePipelineTarget(null)
        }}
      />
    </Box>
  )
}
