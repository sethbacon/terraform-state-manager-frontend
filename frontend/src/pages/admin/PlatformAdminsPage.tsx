import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  AlertTitle,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import RefreshIcon from '@mui/icons-material/Refresh'
import PageTitleIcon from '@mui/icons-material/AdminPanelSettings'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  api,
  PLATFORM_ADMIN_NOTE_MAX_LENGTH,
  type AdminUser,
  type PlatformAdmin,
} from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { apiErrorStatus, extractApiError } from '../../utils/apiError'

/**
 * How a grant is named in prose (banners, confirmations, aria labels). The
 * address is the unambiguous handle; an orphaned grant has none, so it is named
 * by the user id that is all the carrier still knows about it.
 */
function subjectOf(admin: PlatformAdmin): string {
  return admin.email || admin.name || admin.user_id
}

/**
 * Platform-admin management (issue #332; backend `platform_admins.go`).
 *
 * Platform-admin authority lives in a grant table of its own rather than in a
 * role template, so this page is the provenance record for the highest privilege
 * in the product: who holds it, who conferred it, when, and why. A boolean
 * "is admin" column would throw away exactly what the carrier was built to keep.
 *
 * There is no organization picker and there must not be one: TSM has no
 * organization-partitioned domain, and the carrier grants a flat scope that
 * deliberately does not widen organization visibility (backend #393).
 */
export default function PlatformAdminsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const [grantOpen, setGrantOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [note, setNote] = useState('')

  const [revokeTarget, setRevokeTarget] = useState<PlatformAdmin | null>(null)
  // Set when the SERVER refuses a revoke with 409. The client-side prediction
  // below reads the same rule from the same data, but the two can disagree when
  // a user is deleted between the list and the revoke — which is precisely when
  // the refusal matters.
  const [serverRefusedLastAdmin, setServerRefusedLastAdmin] = useState(false)

  const listQuery = useQuery({
    queryKey: queryKeys.admin.platformAdmins(),
    queryFn: api.listPlatformAdmins,
  })
  const admins = listQuery.data ?? []

  // Only needed to populate the grant dialog's picker. The search term goes to
  // the server (the list endpoint honours `q`) so a deployment with more users
  // than one page can still find somebody, matching the Users page.
  const userParams = { page: 1, per_page: 100, ...(userSearch.trim() ? { q: userSearch.trim() } : {}) }
  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users(userParams),
    queryFn: () => api.listAdminUsers(userParams),
    enabled: grantOpen,
    // Each keystroke is a new key; without this the option list empties while
    // the narrower search is in flight and the operator watches their candidate
    // disappear as they type their name.
    placeholderData: keepPreviousData,
  })
  const grantableUsers = (usersQuery.data?.users ?? []).filter(
    (candidate) => !admins.some((admin) => admin.user_id === candidate.id),
  )

  const orphanCount = admins.filter((admin) => admin.orphaned).length
  const trimmedNote = note.trim()
  const noteTooLong = trimmedNote.length > PLATFORM_ADMIN_NOTE_MAX_LENGTH

  /**
   * Predicts TSM's carrier floor: a revoke is refused unless some OTHER grant in
   * this table still resolves to a live user.
   *
   * An orphaned grant is SKIPPED rather than counted. It elevates nobody, so a
   * table listing three administrators of which two are orphans still leaves the
   * third as the last one the floor can see — and a naive `admins.length > 1`
   * would cheerfully hand that revoke to the server. Orphans are listed rather
   * than hidden precisely because this page is the only surface that can remove
   * them, which is what makes the distinction necessary here.
   */
  const isLastCarrierAdmin = (target: PlatformAdmin): boolean =>
    !admins.some((admin) => admin.user_id !== target.user_id && !admin.orphaned)

  const isSelf = (admin: PlatformAdmin): boolean => Boolean(user?.id) && admin.user_id === user?.id

  function closeGrantDialog() {
    setGrantOpen(false)
    setSelectedUser(null)
    setUserSearch('')
    setNote('')
  }

  function closeRevokeDialog() {
    setRevokeTarget(null)
    setServerRefusedLastAdmin(false)
  }

  const invalidateAdmins = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.platformAdmins() })

  /**
   * 503 is TSM's answer both for "the identity store could not be reached" and
   * for "the carrier is not wired up on this deployment". Nothing was changed
   * either way, so it is a retry/check-configuration message rather than the
   * generic breakage a 500 reports — that distinction is the whole reason the
   * backend chose 503 where the sibling registry answers 500.
   */
  const grantErrorMessage = (e: unknown): string => {
    switch (apiErrorStatus(e)) {
      // 400, not 404: the id travels in a body this endpoint is validating.
      case 400:
        return t('admin.platformAdmins.errGrantUnknownUser')
      case 409:
        return t('admin.platformAdmins.errGrantAlready')
      case 503:
        return t('admin.platformAdmins.errUnavailable')
      default:
        return extractApiError(e, t('admin.platformAdmins.errGrant'))
    }
  }

  const revokeErrorMessage = (e: unknown): string => {
    switch (apiErrorStatus(e)) {
      case 404:
        return t('admin.platformAdmins.errRevokeGone')
      case 503:
        return t('admin.platformAdmins.errUnavailable')
      default:
        return extractApiError(e, t('admin.platformAdmins.errRevoke'))
    }
  }

  const grantMutation = useMutation({
    mutationFn: ({ user: target, note: grantNote }: { user: AdminUser; note?: string }) =>
      api.grantPlatformAdmin({ user_id: target.id, ...(grantNote ? { note: grantNote } : {}) }),
    // The 201 echoes the row the carrier wrote and resolves no identities, so
    // the confirmation names the user the operator picked rather than a field
    // the create path never fills in.
    onSuccess: (_grant, variables) => {
      setInfo(
        t('admin.platformAdmins.msgGranted', {
          subject: variables.user.email || variables.user.name || variables.user.id,
        }),
      )
      closeGrantDialog()
      invalidateAdmins()
    },
    onError: (e: unknown) => setError(grantErrorMessage(e)),
  })

  const revokeMutation = useMutation({
    mutationFn: (target: PlatformAdmin) => api.revokePlatformAdmin(target.user_id),
    onSuccess: (_result, target) => {
      setInfo(t('admin.platformAdmins.msgRevoked', { subject: subjectOf(target) }))
      closeRevokeDialog()
      invalidateAdmins()
    },
    onError: (e: unknown) => {
      const status = apiErrorStatus(e)
      // 409 is the carrier floor refusing, not a mistake the operator made. It
      // is explained in place rather than reported as a failure, and the listing
      // is refreshed because the client's picture of who still resolves was
      // evidently stale.
      if (status === 409) {
        setServerRefusedLastAdmin(true)
        invalidateAdmins()
        return
      }
      // A grant that is already gone means somebody else got there first; the
      // stale row has to go before the operator acts on it again.
      if (status === 404) invalidateAdmins()
      setError(revokeErrorMessage(e))
      closeRevokeDialog()
    },
  })

  const lastCarrierAdmin =
    revokeTarget !== null && (serverRefusedLastAdmin || isLastCarrierAdmin(revokeTarget))
  const revokingSelf = revokeTarget !== null && isSelf(revokeTarget)

  const loadErrorStatus = listQuery.isError ? apiErrorStatus(listQuery.error) : undefined

  const renderGrantee = (admin: PlatformAdmin) => {
    if (admin.orphaned) {
      // A real visual state, not a blank name cell: the row is still in the
      // table and is only removable from here.
      return (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <PersonOffIcon fontSize="small" color="warning" />
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {t('admin.platformAdmins.orphanTitle')}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block' }}
          >
            {admin.user_id}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {t('admin.platformAdmins.orphanHint')}
          </Typography>
        </>
      )
    }
    return (
      <>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {admin.name || admin.email || admin.user_id}
          </Typography>
          {isSelf(admin) && <Chip label={t('admin.platformAdmins.chipYou')} size="small" />}
        </Stack>
        {admin.email && admin.name && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {admin.email}
          </Typography>
        )}
      </>
    )
  }

  const renderGrantedBy = (admin: PlatformAdmin) => {
    // NULL granted_by is the first-boot bootstrap row: nobody conferred it.
    if (admin.granted_by === null) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.platformAdmins.grantedByBootstrap')}
        </Typography>
      )
    }
    // A granter who has since been deleted keeps the id and loses the address.
    if (!admin.granted_by_email) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('admin.platformAdmins.grantedByUnresolved', { id: admin.granted_by })}
        </Typography>
      )
    }
    return <Typography variant="body2">{admin.granted_by_email}</Typography>
  }

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('admin.platformAdmins.pageTitle')}
        description={t('admin.platformAdmins.pageSubtitle')}
        actions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                listQuery.refetch()
              }}
            >
              {t('common.refresh')}
            </Button>
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setGrantOpen(true)}>
              {t('admin.platformAdmins.grantButton')}
            </Button>
          </Box>
        }
      />

      {listQuery.isError &&
        (loadErrorStatus === 503 ? (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            data-testid="platform-admins-unavailable"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  listQuery.refetch()
                }}
              >
                {t('common.retry')}
              </Button>
            }
          >
            <AlertTitle>{t('admin.platformAdmins.unavailableTitle')}</AlertTitle>
            {t('admin.platformAdmins.errUnavailable')}
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 3 }} data-testid="platform-admins-load-error">
            {extractApiError(listQuery.error, t('admin.platformAdmins.errLoad'))}
          </Alert>
        ))}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

      {orphanCount > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} data-testid="platform-admins-orphan-summary">
          {t('admin.platformAdmins.orphanSummary', { count: orphanCount })}
        </Alert>
      )}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.platformAdmins.thAdministrator')}</TableCell>
                <TableCell>{t('admin.platformAdmins.thGrantedBy')}</TableCell>
                <TableCell>{t('admin.platformAdmins.thGrantedAt')}</TableCell>
                <TableCell>{t('admin.platformAdmins.thNote')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress aria-label={t('common.loading')} />
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                    <EmptyState
                      title={t('admin.platformAdmins.emptyTitle')}
                      description={t('admin.platformAdmins.emptyDescription')}
                      icon={<PageTitleIcon />}
                      data-testid="platform-admins-empty-state"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell>{renderGrantee(admin)}</TableCell>
                    <TableCell>{renderGrantedBy(admin)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(admin.granted_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {admin.note ? (
                        <Typography variant="body2">{admin.note}</Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                          {t('admin.platformAdmins.noNote')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        aria-label={t('admin.platformAdmins.ariaRevoke', { subject: subjectOf(admin) })}
                        onClick={() => {
                          setError(null)
                          setServerRefusedLastAdmin(false)
                          setRevokeTarget(admin)
                        }}
                      >
                        {t('admin.platformAdmins.revoke')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Grant dialog */}
      <Dialog open={grantOpen} onClose={closeGrantDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.platformAdmins.grantDialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('admin.platformAdmins.grantDialogIntro')}
            </Typography>
            <Autocomplete
              options={grantableUsers}
              value={selectedUser}
              onChange={(_event, value) => setSelectedUser(value)}
              onInputChange={(_event, value) => setUserSearch(value)}
              getOptionLabel={(option) => (option.name ? `${option.name} (${option.email})` : option.email)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={usersQuery.isLoading}
              noOptionsText={t('admin.platformAdmins.noUserOptions')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('admin.platformAdmins.labelUser')}
                  placeholder={t('admin.platformAdmins.placeholderUser')}
                  required
                />
              )}
              fullWidth
            />
            <TextField
              label={t('admin.platformAdmins.labelNote')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              rows={3}
              fullWidth
              error={noteTooLong}
              helperText={
                noteTooLong
                  ? t('admin.platformAdmins.errNoteTooLong', { max: PLATFORM_ADMIN_NOTE_MAX_LENGTH })
                  : t('admin.platformAdmins.helpNote', {
                    used: trimmedNote.length,
                    max: PLATFORM_ADMIN_NOTE_MAX_LENGTH,
                  })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGrantDialog} disabled={grantMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={!selectedUser || noteTooLong || grantMutation.isPending}
            onClick={() => {
              if (!selectedUser) return
              setError(null)
              // The empty-note decision belongs to the mutationFn alone: a
              // second conditional here would make the payload depend on two
              // places that must agree, and a mutation to either would be
              // masked by the other.
              grantMutation.mutate({ user: selectedUser, note: trimmedNote })
            }}
          >
            {grantMutation.isPending
              ? t('admin.platformAdmins.granting')
              : t('admin.platformAdmins.confirmGrant')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke confirmation — or, when the carrier floor will refuse, the
          explanation of why there is nothing to confirm. */}
      <Dialog open={revokeTarget !== null} onClose={closeRevokeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.platformAdmins.revokeDialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {lastCarrierAdmin ? (
              <Alert severity="info" data-testid="platform-admins-last-admin">
                <AlertTitle>{t('admin.platformAdmins.lastAdminTitle')}</AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {t('admin.platformAdmins.lastAdminBody')}
                </Typography>
                <Typography variant="body2">{t('admin.platformAdmins.lastAdminScope')}</Typography>
              </Alert>
            ) : (
              <>
                <Typography>
                  {t('admin.platformAdmins.revokeConfirm', {
                    subject: revokeTarget ? subjectOf(revokeTarget) : '',
                  })}
                </Typography>
                {revokingSelf && (
                  <Alert severity="warning" data-testid="platform-admins-self-revoke">
                    <AlertTitle>{t('admin.platformAdmins.selfRevokeTitle')}</AlertTitle>
                    {t('admin.platformAdmins.selfRevokeBody')}
                  </Alert>
                )}
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('admin.platformAdmins.revokeAudit')}
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRevokeDialog} disabled={revokeMutation.isPending}>
            {lastCarrierAdmin ? t('common.close') : t('common.cancel')}
          </Button>
          {!lastCarrierAdmin && (
            <Button
              variant="contained"
              color="error"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (!revokeTarget) return
                setError(null)
                revokeMutation.mutate(revokeTarget)
              }}
            >
              {revokeMutation.isPending
                ? t('admin.platformAdmins.revoking')
                : revokingSelf
                  ? t('admin.platformAdmins.confirmRevokeSelf')
                  : t('admin.platformAdmins.confirmRevoke')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}
