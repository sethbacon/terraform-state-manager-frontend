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
  Divider,
  FormControl,
  FormHelperText,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  type SelectChangeEvent,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BusinessIcon from '@mui/icons-material/Business'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip'
import SearchIcon from '@mui/icons-material/Search'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import { api, type AdminUser, type AdminUserMembership, type AdminOrganization, type RoleTemplate } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { getRoleTemplateColor } from '../../utils/scopes'

export default function UsersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // GDPR action state
  const [exportingUserId, setExportingUserId] = useState<string | null>(null)
  const [eraseTarget, setEraseTarget] = useState<AdminUser | null>(null)
  const [eraseConfirmText, setEraseConfirmText] = useState('')

  // Add/edit dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [formData, setFormData] = useState({ email: '', name: '', organizationId: '', roleTemplateId: '' })
  const [editMemberships, setEditMemberships] = useState<AdminUserMembership[]>([])

  const params = { page: page + 1, per_page: rowsPerPage, ...(searchQuery ? { q: searchQuery } : {}) }
  const usersQuery = useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => api.listAdminUsers(params),
  })
  const users = usersQuery.data?.users ?? []
  const totalUsers = usersQuery.data?.total ?? 0

  // Orgs + role templates for the membership pickers (cheap, cached).
  const orgsQuery = useQuery({ queryKey: queryKeys.admin.organizations(), queryFn: api.listAdminOrganizations })
  const rolesQuery = useQuery({ queryKey: queryKeys.admin.roles(), queryFn: api.listAdminRoles })
  const organizations: AdminOrganization[] = orgsQuery.data ?? []
  const roleTemplates: RoleTemplate[] = rolesQuery.data ?? []

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.usersAll })
    // Admin dashboard counters include users.
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
  }

  const handleOpenDialog = (user?: AdminUser) => {
    if (user) {
      setEditingUser(user)
      setFormData({ email: user.email, name: user.name || '', organizationId: '', roleTemplateId: '' })
      setEditMemberships(user.memberships ?? [])
    } else {
      setEditingUser(null)
      setFormData({ email: '', name: '', organizationId: '', roleTemplateId: '' })
      setEditMemberships([])
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
    setError(null)
    setEditMemberships([])
  }

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUser) {
        await api.updateAdminUser(editingUser.id, { name: formData.name })
      } else {
        const created = await api.createAdminUser({ email: formData.email, name: formData.name })
        if (formData.organizationId) {
          await api.addAdminOrgMember(formData.organizationId, {
            user_id: created.id,
            role_template_id: formData.roleTemplateId || undefined,
          })
        }
      }
    },
    onSuccess: () => {
      handleCloseDialog()
      invalidateUsers()
    },
    onError: () => setError(t('admin.users.errSave')),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.deleteAdminUser(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setError(null)
      invalidateUsers()
    },
    onError: () => setError(t('admin.users.errDelete')),
  })

  // GDPR Article 17 — anonymize user PII while preserving the audit trail.
  const eraseUserMutation = useMutation({
    mutationFn: (id: string) => api.eraseAdminUser(id),
    onSuccess: (data) => {
      setEraseTarget(null)
      setEraseConfirmText('')
      setError(null)
      setInfo(data.message || t('admin.users.userErased'))
      invalidateUsers()
    },
    onError: () => setError(t('admin.users.errErase')),
  })

  // GDPR Articles 15/20 — full data export via a temporary blob URL.
  const handleExportClick = async (user: AdminUser) => {
    setError(null)
    setInfo(null)
    setExportingUserId(user.id)
    try {
      const { blob, filename } = await api.exportAdminUserData(user.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setInfo(t('admin.users.exportedData', { email: user.email }))
    } catch {
      setError(t('admin.users.errExport'))
    } finally {
      setExportingUserId(null)
    }
  }

  const refreshEditMemberships = async (userId: string) => {
    const memberships = await api.getAdminUserMemberships(userId)
    setEditMemberships(memberships)
    invalidateUsers()
  }

  const handleAddMembership = async () => {
    if (!editingUser || !formData.organizationId) return
    try {
      setError(null)
      await api.addAdminOrgMember(formData.organizationId, {
        user_id: editingUser.id,
        role_template_id: formData.roleTemplateId || undefined,
      })
      await refreshEditMemberships(editingUser.id)
      setFormData((prev) => ({ ...prev, organizationId: '', roleTemplateId: '' }))
    } catch {
      setError(t('admin.users.errAddMembership'))
    }
  }

  const handleUpdateMembershipRole = async (orgId: string, roleTemplateId: string | null) => {
    if (!editingUser) return
    try {
      setError(null)
      await api.updateAdminOrgMember(orgId, editingUser.id, { role_template_id: roleTemplateId || undefined })
      await refreshEditMemberships(editingUser.id)
    } catch {
      setError(t('admin.users.errUpdateRole'))
    }
  }

  const handleRemoveMembership = async (orgId: string) => {
    if (!editingUser) return
    try {
      setError(null)
      await api.removeAdminOrgMember(orgId, editingUser.id)
      setEditMemberships((prev) => prev.filter((m) => m.organization_id !== orgId))
      invalidateUsers()
    } catch {
      setError(t('admin.users.errRemoveMembership'))
    }
  }

  const availableOrganizations = organizations.filter(
    (org) => !editMemberships.some((m) => m.organization_id === org.id),
  )

  return (
    <Box>
      <PageHeader
        title={t('admin.users.pageTitle')}
        description={t('admin.users.pageSubtitle')}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('admin.users.addUser')}
          </Button>
        }
      />
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
      <TextField
        fullWidth
        placeholder={t('admin.users.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          setPage(0)
        }}
        sx={{ mb: 3 }}
        slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} /> } }}
      />
      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.users.thName')}</TableCell>
                <TableCell>{t('admin.users.thEmail')}</TableCell>
                <TableCell>{t('admin.users.thOrgRoles')}</TableCell>
                <TableCell>{t('admin.users.thCreated')}</TableCell>
                <TableCell align="right">{t('admin.users.thActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress aria-label={t('common.loading')} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
                    <EmptyState
                      title={t('admin.users.emptyTitle')}
                      description={t('admin.users.emptyDescription')}
                      icon={<PersonIcon />}
                      data-testid="users-empty-state"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.memberships && user.memberships.length > 0 ? (
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {user.memberships.map((m) => (
                            <Tooltip
                              key={m.organization_id}
                              title={
                                m.role_template_display_name
                                  ? t('admin.users.tooltipMembership', {
                                      org: m.organization_name,
                                      role: m.role_template_display_name,
                                    })
                                  : t('admin.users.tooltipMembershipNoRole', { org: m.organization_name })
                              }
                            >
                              <Chip
                                icon={<BusinessIcon />}
                                label={t('admin.users.chipMembership', {
                                  org: m.organization_name,
                                  role: m.role_template_display_name || t('admin.users.noRole'),
                                })}
                                size="small"
                                color={getRoleTemplateColor(m.role_template_name || undefined)}
                                variant="outlined"
                                sx={{ mb: 0.5 }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {t('admin.users.noOrganizations')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('admin.users.tooltipEdit')}>
                        <IconButton
                          size="small"
                          aria-label={t('admin.users.ariaEdit')}
                          onClick={() => handleOpenDialog(user)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('admin.users.tooltipExport')}>
                        <span>
                          <IconButton
                            size="small"
                            aria-label={t('admin.users.ariaExport')}
                            onClick={() => handleExportClick(user)}
                            disabled={exportingUserId === user.id}
                          >
                            {exportingUserId === user.id ? <CircularProgress size={20} /> : <DownloadIcon />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={t('admin.users.tooltipErase')}>
                        <IconButton
                          size="small"
                          aria-label={t('admin.users.ariaErase')}
                          onClick={() => {
                            setEraseTarget(user)
                            setEraseConfirmText('')
                          }}
                          color="warning"
                        >
                          <PrivacyTipIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('admin.users.tooltipDelete')}>
                        <IconButton
                          size="small"
                          aria-label={t('admin.users.ariaDelete')}
                          onClick={() => setDeleteTarget(user)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10))
            setPage(0)
          }}
        />
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? t('admin.users.dialogTitleEdit') : t('admin.users.dialogTitleAdd')}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label={t('admin.users.labelEmail')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
              disabled={!!editingUser}
              helperText={t('admin.users.helpEmail')}
            />
            <TextField
              label={t('admin.users.labelName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              helperText={t('admin.users.helpName')}
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {t('admin.users.sectionOrgMembership')}
            </Typography>

            {editingUser && editMemberships.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {t('admin.users.currentOrgs')}
                </Typography>
                <Stack spacing={1}>
                  {editMemberships.map((m) => (
                    <Box
                      key={m.organization_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50'),
                        borderRadius: 1,
                      }}
                    >
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {m.organization_name}
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                          value={m.role_template_id || ''}
                          displayEmpty
                          onChange={(e: SelectChangeEvent) =>
                            handleUpdateMembershipRole(m.organization_id ?? '', e.target.value || null)
                          }
                        >
                          <MenuItem value="">
                            <em>{t('admin.users.noRole')}</em>
                          </MenuItem>
                          {roleTemplates.map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.display_name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton
                        size="small"
                        aria-label={t('admin.users.ariaRemoveFromOrg')}
                        onClick={() => handleRemoveMembership(m.organization_id ?? '')}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl fullWidth size="small">
                <InputLabel>{editingUser ? t('admin.users.addToOrg') : t('admin.users.orgOptional')}</InputLabel>
                <Select
                  value={formData.organizationId}
                  label={editingUser ? t('admin.users.addToOrg') : t('admin.users.orgOptional')}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, organizationId: e.target.value })}
                  disabled={orgsQuery.isLoading}
                >
                  <MenuItem value="">
                    <em>{t('admin.users.menuNone')}</em>
                  </MenuItem>
                  {availableOrganizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.display_name || org.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{t('admin.users.helpAssignOrg')}</FormHelperText>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{t('admin.users.labelRoleTemplate')}</InputLabel>
                <Select
                  value={formData.roleTemplateId}
                  label={t('admin.users.labelRoleTemplate')}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, roleTemplateId: e.target.value })}
                  disabled={!formData.organizationId || rolesQuery.isLoading}
                >
                  <MenuItem value="">
                    <em>{t('admin.users.noRole')}</em>
                  </MenuItem>
                  {roleTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.display_name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{t('admin.users.helpRoleTemplate')}</FormHelperText>
              </FormControl>
              {editingUser && (
                <Button
                  variant="outlined"
                  onClick={handleAddMembership}
                  disabled={!formData.organizationId}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  {t('admin.users.add')}
                </Button>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('admin.users.cancel')}</Button>
          <Button
            onClick={() => {
              setError(null)
              saveUserMutation.mutate()
            }}
            variant="contained"
            disabled={saveUserMutation.isPending || !formData.email.trim() || !formData.name.trim()}
          >
            {editingUser ? t('admin.users.save') : t('admin.users.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('admin.users.dialogTitleDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('admin.users.confirmDelete', { name: deleteTarget?.name })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('admin.users.cancel')}</Button>
          <Button
            onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
            color="error"
            variant="contained"
          >
            {t('admin.users.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GDPR Erase Confirmation Dialog */}
      <Dialog
        open={Boolean(eraseTarget)}
        onClose={() => {
          if (!eraseUserMutation.isPending) {
            setEraseTarget(null)
            setEraseConfirmText('')
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('admin.users.eraseTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              {t('admin.users.eraseWarnPart1')}
              <strong>{eraseTarget?.email}</strong>
              {t('admin.users.eraseWarnPart2')}
              <strong>{t('admin.users.eraseWarnCannotUndo')}</strong>
            </Alert>
            <Typography variant="body2">
              {t('admin.users.eraseConfirmPart1')}
              <code>{eraseTarget?.email}</code>
              {t('admin.users.eraseConfirmPart2')}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              value={eraseConfirmText}
              onChange={(e) => setEraseConfirmText(e.target.value)}
              placeholder={eraseTarget?.email}
              disabled={eraseUserMutation.isPending}
              slotProps={{ htmlInput: { 'aria-label': t('admin.users.ariaConfirmErasure') } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEraseTarget(null)
              setEraseConfirmText('')
            }}
            disabled={eraseUserMutation.isPending}
          >
            {t('admin.users.cancel')}
          </Button>
          <Button
            onClick={() =>
              eraseTarget && eraseConfirmText === eraseTarget.email && eraseUserMutation.mutate(eraseTarget.id)
            }
            color="error"
            variant="contained"
            disabled={eraseUserMutation.isPending || eraseConfirmText !== (eraseTarget?.email ?? '')}
          >
            {eraseUserMutation.isPending ? <CircularProgress size={20} /> : t('admin.users.erase')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
