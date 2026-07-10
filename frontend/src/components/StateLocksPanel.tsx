import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import { api, type StateLock } from '../services/api'
import { queryKeys } from '../services/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from './ConfirmDialog'

// Mirrors the backend's staleLockTTL: request-scoped locks older than this
// belong to a crashed process and are safe to force-unlock.
const STALE_LOCK_MS = 15 * 60 * 1000

// StateLocksPanel lists the app-level advisory locks currently held for a
// source, with an admin-only force-unlock escape hatch. It renders nothing
// while no locks are held — the common case.
export default function StateLocksPanel({ sourceId }: { sourceId: string }) {
  const { t } = useTranslation()
  const { hasScope } = useAuth()
  const queryClient = useQueryClient()
  const [unlockTarget, setUnlockTarget] = useState<StateLock | null>(null)

  const locksQuery = useQuery({
    queryKey: queryKeys.sources.locks(sourceId),
    queryFn: () => api.listStateLocks(sourceId),
  })

  const unlockMutation = useMutation({
    mutationFn: (key: string) => api.forceUnlock(sourceId, key),
    onSuccess: () => {
      setUnlockTarget(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.sources.locks(sourceId) })
    },
  })

  const locks = locksQuery.data ?? []
  if (locks.length === 0) return null

  return (
    <Card variant="outlined" sx={{ mt: 2, p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LockIcon fontSize="inherit" />
        {t('pages.sources.locksTitle', { count: locks.length })}
      </Typography>
      <List dense disablePadding>
        {locks.map((lock) => {
          const stale = Date.now() - Date.parse(lock.acquired_at) > STALE_LOCK_MS
          return (
            <ListItem
              key={lock.id}
              disableGutters
              secondaryAction={
                hasScope('admin') ? (
                  <Button
                    size="small"
                    color="error"
                    onClick={() => setUnlockTarget(lock)}
                    disabled={unlockMutation.isPending}
                  >
                    {t('pages.sources.forceUnlock')}
                  </Button>
                ) : undefined
              }
            >
              <ListItemText
                primary={
                  <>
                    {lock.state_key}
                    {stale && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={t('pages.sources.lockStale')}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </>
                }
                secondary={t('pages.sources.lockHeldBy', {
                  actor: lock.actor || t('pages.sources.lockUnknownActor'),
                  since: new Date(lock.acquired_at).toLocaleString(),
                })}
              />
            </ListItem>
          )
        })}
      </List>
      <ConfirmDialog
        open={unlockTarget !== null}
        onClose={() => setUnlockTarget(null)}
        onConfirm={async () => {
          if (unlockTarget) await unlockMutation.mutateAsync(unlockTarget.state_key)
        }}
        title={t('pages.sources.forceUnlockTitle')}
        description={t('pages.sources.forceUnlockBody', { key: unlockTarget?.state_key ?? '' })}
        confirmLabel={t('pages.sources.forceUnlock')}
        severity="warning"
        loading={unlockMutation.isPending}
      />
    </Card>
  )
}
