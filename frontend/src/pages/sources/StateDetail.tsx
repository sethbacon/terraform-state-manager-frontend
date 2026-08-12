import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  Divider,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import IosShareIcon from '@mui/icons-material/IosShare'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useTranslation } from 'react-i18next'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import StateHistoryTab from '../../components/StateHistoryTab'
import AnalysisTab from './tabs/AnalysisTab'
import BackupsTab from './tabs/BackupsTab'
import ModulesTab from './tabs/ModulesTab'
import OutputsTab from './tabs/OutputsTab'
import RawTab from './tabs/RawTab'
import ResourcesTab from './tabs/ResourcesTab'
import DeleteStateDialog from './DeleteStateDialog'
import StateOpsDialog from './StateOpsDialog'
import TransferDialog from './TransferDialog'

// The right-hand pane of the states browser: a scope-gated toolbar (state ops,
// transfer, export, delete) over the seven detail tabs. It owns only which tab
// is showing and which of its three dialogs is open — every tab fetches its own
// data, and every dialog owns its own form and mutation.
export default function StateDetail({
  sourceId,
  stateKey,
  stateName,
  onDeleted,
}: {
  sourceId: string
  stateKey: string
  /** Friendly display name (HCP keys are workspace ids); defaults to the key. */
  stateName?: string
  /** Called after the state object is deleted, so the parent clears the selection. */
  onDeleted: () => void
}) {
  const displayName = stateName ?? stateKey
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const [tab, setTab] = useState(0)
  const [transferOpen, setTransferOpen] = useState(false)
  const [opsOpen, setOpsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null)
  return (
    <>
      <Card variant="outlined">
        <Stack direction="row" sx={{ px: 2, pt: 1, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v as number)} sx={{ minHeight: 0 }}>
            <Tab label={t('pages.sources.tabAnalysis')} />
            <Tab label={t('pages.sources.tabResources')} />
            <Tab label={t('pages.sources.tabOutputs')} />
            <Tab label={t('pages.sources.tabHistory')} />
            <Tab label={t('pages.sources.tabRaw')} />
            <Tab label={t('pages.sources.tabBackups')} />
            <Tab label={t('pages.sources.tabModules')} />
          </Tabs>
          {hasScope('state:write') && (
            <Button size="small" variant="outlined" onClick={() => setOpsOpen(true)}>
              {t('pages.sources.stateOps')}
            </Button>
          )}
          {hasScope('state:transfer') && (
            <Button size="small" variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => setTransferOpen(true)}>
              {t('pages.sources.transfer')}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<IosShareIcon />}
            onClick={(e) => setDownloadAnchor(e.currentTarget)}
          >
            {t('pages.sources.export')}
          </Button>
          <Menu anchorEl={downloadAnchor} open={Boolean(downloadAnchor)} onClose={() => setDownloadAnchor(null)}>
            <ListSubheader sx={{ lineHeight: 2, bgcolor: 'transparent' }}>
              {t('pages.sources.exportReportHeader')}
            </ListSubheader>
            {(['md', 'json', 'csv'] as const).map((format) => (
              <MenuItem
                key={format}
                onClick={() => {
                  void api.downloadReport(sourceId, stateKey, format)
                  setDownloadAnchor(null)
                }}
              >
                {format.toUpperCase()}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={() => {
                void api.downloadRawState(sourceId, stateKey)
                setDownloadAnchor(null)
              }}
            >
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('pages.sources.downloadState')}</ListItemText>
            </MenuItem>
          </Menu>
          {hasScope('admin') && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteOpen(true)}
            >
              {t('pages.sources.deleteState')}
            </Button>
          )}
        </Stack>
        <Divider />
        <CardContent>
          {tab === 0 && <AnalysisTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 1 && <ResourcesTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 2 && <OutputsTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 3 && <StateHistoryTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 4 && <RawTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 5 && <BackupsTab sourceId={sourceId} stateKey={stateKey} />}
          {tab === 6 && <ModulesTab sourceId={sourceId} stateKey={stateKey} />}
        </CardContent>
      </Card>
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
      />
      <StateOpsDialog
        open={opsOpen}
        onClose={() => setOpsOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
      />
      <DeleteStateDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        sourceId={sourceId}
        stateKey={stateKey}
        stateName={displayName}
        onDeleted={onDeleted}
      />
    </>
  )
}
