import { useMutation } from '@tanstack/react-query'
import { Button, Chip, CircularProgress, Stack, Tooltip } from '@mui/material'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineOutlined'
import { useTranslation } from 'react-i18next'
import { api, type TestSourceConfigInput } from '../../services/api'
import { extractApiError as errMsg } from '../../utils/apiError'

// DialogTestConnection is the "test before save" control shared by the Add and
// Edit dialogs: it validates the connectivity of the config the operator is
// about to save (build() returns null while required fields are blank) without
// persisting anything, mirroring the per-card TestConnectionAction.
export default function DialogTestConnection({ build }: { build: () => TestSourceConfigInput | null }) {
  const { t } = useTranslation()
  const m = useMutation({ mutationFn: (input: TestSourceConfigInput) => api.testSourceConfig(input) })
  const input = build()
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mr: 'auto' }}>
      <Button
        size="small"
        onClick={() => input && m.mutate(input)}
        disabled={!input || m.isPending}
        startIcon={m.isPending ? <CircularProgress size={14} /> : <PlayCircleOutlineIcon fontSize="small" />}
      >
        {t('pages.sources.testConnection')}
      </Button>
      {m.isSuccess && (
        <Chip size="small" color="success" variant="outlined" label={t('pages.sources.testOk', { count: m.data.states ?? 0 })} />
      )}
      {m.isError && (
        <Tooltip title={errMsg(m.error)}>
          <Chip size="small" color="error" variant="outlined" label={t('pages.sources.testFailed')} />
        </Tooltip>
      )}
    </Stack>
  )
}
