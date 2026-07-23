import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
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
import PeopleIcon from '@mui/icons-material/People'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ConfirmDialog from '../../components/ConfirmDialog'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Business'
import {
  api,
  type AdminOrganization,
  type AdminUser,
  type OrgMemberWithUser,
  type RoleTemplate,
} from '../../services/api'
import { queryKeys } from '../../services/queryKeys'

// URL-safe organization name (mirrors the registry's segment rule).
const ORG_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/

export default function OrganizationsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false)
  const [editingOrg, setEditingOrg] = useState<AdminOrganization | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null)
  const [membersOrg, setMembersOrg] = useState<AdminOrganization | null>(null)
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  // Members state
  const [members, setMembers] = useState<OrgMemberWithUser[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [allUsers, setAllUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedRoleTemplateId, setSelectedRoleTemplateId] = useState('')

  const [formData, setFormData] = useState({ name: '', display_name: '', idp_type: '', idp_name: '' })

  const orgsQuery = useQuery({ queryKey: queryKeys.admin.organizations(), queryFn: api.listAdminOrganizations })
  const organizations = orgsQuery.data ?? []
  const rolesQuery = useQuery({ queryKey: queryKeys.admin.roles(), queryFn: api.listAdminRoles })
  const roleTemplates: RoleTemplate[] = rolesQuery.data ?? []

  const invalidateOrgs = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.organizations() })
    // Admin dashboard counters include organizations.
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats() })
  }

  const handleOpenDialog = (org?: AdminOrganization) => {
    if (org) {
      setEditingOrg(org)
      setFormData({
        name: org.name,
        display_name: org.display_name || '',
        idp_type: org.idp_type || '',
        idp_name: org.idp_name || '',
      })
    } else {
      setEditingOrg(null)
      setFormData({ name: '', display_name: '', idp_type: '', idp_name: '' })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingOrg(null)
    setError(null)
  }

  const saveOrgMutation = useMutation({
    mutationFn: async () => {
      if (editingOrg) {
        await api.updateAdminOrganization(editingOrg.id, {
          ...(formData.name !== editingOrg.name ? { name: formData.name } : {}),
          display_name: formData.display_name,
          idp_type: formData.idp_type || '',
          idp_name: formData.idp_name || '',
        })
      } else {
        await api.createAdminOrganization({ name: formData.name, display_name: formData.display_name })
      }
    },
    onSuccess: () => {
      handleCloseDialog()
      invalidateOrgs()
    },
    onError: () => setError(t('admin.organizations.errSave')),
  })

  const deleteOrgMutation = useMutation({
    mutationFn: (id: string) => api.deleteAdminOrganization(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setError(null)
      invalidateOrgs()
    },
    onError: () => setError(t('admin.organizations.errDelete')),
  })

  const handleSaveOrganization = () => {
    setError(null)
    if (!ORG_NAME_RE.test(formData.name)) {
      setError(t('admin.organizations.errName'))
      return
    }
    saveOrgMutation.mutate()
  }

  const loadMembers = async (orgId: string) => {
    try {
      setMembersLoading(true)
      setMembers(await api.listAdminOrgMembers(orgId))
    } catch {
      setMembers([])
    } finally {
      setMembersLoading(false)
    }
  }

  const handleViewMembers = async (org: AdminOrganization) => {
    setMembersOrg(org)
    await loadMembers(org.id)
  }

  const handleOpenAddMember = async () => {
    try {
      const { users } = await api.listAdminUsers({ page: 1, per_page: 100 })
      setAllUsers(users)
    } catch {
      setAllUsers([])
    }
    setSelectedUser(null)
    setSelectedRoleTemplateId('')
    setAddMemberOpen(true)
  }

  const handleAddMember = async () => {
    if (!membersOrg || !selectedUser) return
    try {
      setError(null)
      await api.addAdminOrgMember(membersOrg.id, {
        user_id: selectedUser.id,
        role_template_id: selectedRoleTemplateId || undefined,
      })
      setAddMemberOpen(false)
      await loadMembers(membersOrg.id)
    } catch {
      setError(t('admin.organizations.errAddMember'))
    }
  }

  const handleUpdateMemberRole = async (userId: string, roleTemplateId: string | null) => {
    if (!membersOrg) return
    try {
      setError(null)
      await api.updateAdminOrgMember(membersOrg.id, userId, { role_template_id: roleTemplateId || undefined })
      await loadMembers(membersOrg.id)
    } catch {
      setError(t('admin.organizations.errUpdateRole'))
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!membersOrg) return
    try {
      setError(null)
      await api.removeAdminOrgMember(membersOrg.id, userId)
      await loadMembers(membersOrg.id)
    } catch {
      setError(t('admin.organizations.errRemoveMember'))
    }
  }

  return (
    <Box>
      <PageHeader
        icon={<PageTitleIcon />}
        title={t('admin.organizations.pageTitle')}
        description={t('admin.organizations.pageSubtitle')}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            {t('admin.organizations.addOrganization')}
          </Button>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Paper variant="outlined">
        {orgsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress aria-label={t('common.loading')} />
          </Box>
        ) : organizations.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: 'text.secondary' }}>{t('admin.organizations.emptyState')}</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ mt: 2 }}>
              {t('admin.organizations.createFirst')}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.organizations.thName')}</TableCell>
                  <TableCell>{t('admin.organizations.thDisplayName')}</TableCell>
                  <TableCell>{t('admin.organizations.thIdentityProvider')}</TableCell>
                  <TableCell>{t('admin.organizations.thMembers')}</TableCell>
                  <TableCell>{t('admin.organizations.thCreated')}</TableCell>
                  <TableCell align="right">{t('admin.organizations.thActions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 'medium' }}>{org.name}</Typography>
                    </TableCell>
                    <TableCell>{org.display_name || '-'}</TableCell>
                    <TableCell>
                      {org.idp_type ? (
                        <Chip
                          label={`${org.idp_type.toUpperCase()}${org.idp_name ? `: ${org.idp_name}` : ''}`}
                          size="small"
                          color="info"
                        />
                      ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {t('admin.organizations.idpAny')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<PeopleIcon />} onClick={() => handleViewMembers(org)}>
                        {t('admin.organizations.viewMembers')}
                      </Button>
                    </TableCell>
                    <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('admin.organizations.tooltipEditOrg')}>
                        <IconButton
                          size="small"
                          aria-label={t('admin.organizations.ariaEditOrg')}
                          onClick={() => handleOpenDialog(org)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('admin.organizations.tooltipDeleteOrg')}>
                        <IconButton
                          size="small"
                          aria-label={t('admin.organizations.ariaDeleteOrg')}
                          onClick={() => setDeleteTarget(org)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Organization Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingOrg ? t('admin.organizations.dialogTitleEdit') : t('admin.organizations.dialogTitleAdd')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label={t('admin.organizations.labelName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              error={!!formData.name && !ORG_NAME_RE.test(formData.name)}
              helperText={
                formData.name && !ORG_NAME_RE.test(formData.name)
                  ? t('admin.organizations.helpNameInvalid')
                  : t('admin.organizations.helpName')
              }
            />
            {editingOrg && formData.name !== editingOrg.name && ORG_NAME_RE.test(formData.name) && (
              <Alert severity="warning">
                {t('admin.organizations.renameWarnPart1')}
                <strong>{editingOrg.name}</strong>
                {t('admin.organizations.renameWarnPart2')}
                <strong>{formData.name}</strong>
                {t('admin.organizations.renameWarnPart3')}
              </Alert>
            )}
            <TextField
              label={t('admin.organizations.labelDisplayName')}
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              fullWidth
              helperText={t('admin.organizations.helpDisplayName')}
            />
            {editingOrg && (
              <>
                <FormControl fullWidth>
                  <InputLabel>{t('admin.organizations.labelIdpType')}</InputLabel>
                  <Select
                    value={formData.idp_type}
                    label={t('admin.organizations.labelIdpType')}
                    onChange={(e: SelectChangeEvent) =>
                      setFormData({ ...formData, idp_type: e.target.value, idp_name: '' })
                    }
                  >
                    <MenuItem value="">
                      <em>{t('admin.organizations.menuIdpAny')}</em>
                    </MenuItem>
                    <MenuItem value="oidc">OIDC</MenuItem>
                    <MenuItem value="saml">SAML</MenuItem>
                    <MenuItem value="ldap">LDAP</MenuItem>
                  </Select>
                </FormControl>
                {formData.idp_type && (
                  <TextField
                    label={t('admin.organizations.labelIdpName')}
                    value={formData.idp_name}
                    onChange={(e) => setFormData({ ...formData, idp_name: e.target.value })}
                    fullWidth
                    helperText={t('admin.organizations.helpIdpName')}
                  />
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('admin.organizations.cancel')}</Button>
          <Button
            onClick={handleSaveOrganization}
            variant="contained"
            disabled={!formData.name.trim() || !formData.display_name.trim() || saveOrgMutation.isPending}
          >
            {editingOrg ? t('admin.organizations.save') : t('admin.organizations.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog. Type-to-confirm: deleting an organization
          cascades through memberships — higher blast radius than a source
          delete, which already requires the typed name. */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteOrgMutation.mutate(deleteTarget.id)
        }}
        title={t('admin.organizations.dialogTitleDelete')}
        description={t('admin.organizations.confirmDelete', { name: deleteTarget?.name })}
        confirmLabel={t('admin.organizations.delete')}
        cancelLabel={t('admin.organizations.cancel')}
        severity="error"
        typeToConfirmText={deleteTarget?.name ?? ''}
        loading={deleteOrgMutation.isPending}
      />

      {/* Members Dialog */}
      <Dialog open={Boolean(membersOrg)} onClose={() => setMembersOrg(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('admin.organizations.membersTitle', { name: membersOrg?.name })}</span>
            <Button variant="contained" size="small" startIcon={<PersonAddIcon />} onClick={handleOpenAddMember}>
              {t('admin.organizations.addMember')}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {t('admin.organizations.membersManageDesc')}
          </Typography>
          {membersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress aria-label={t('common.loading')} />
            </Box>
          ) : members.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>{t('admin.organizations.noMembers')}</Typography>
              <Button variant="outlined" startIcon={<PersonAddIcon />} onClick={handleOpenAddMember} sx={{ mt: 2 }}>
                {t('admin.organizations.addFirstMember')}
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('admin.organizations.thName')}</TableCell>
                    <TableCell>{t('admin.organizations.thEmail')}</TableCell>
                    <TableCell>{t('admin.organizations.thRole')}</TableCell>
                    <TableCell align="right">{t('admin.organizations.thActions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>{member.user_name || t('admin.organizations.unknown')}</TableCell>
                      <TableCell>{member.user_email || '-'}</TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <Select
                            value={member.role_template_id || ''}
                            displayEmpty
                            onChange={(e: SelectChangeEvent) =>
                              handleUpdateMemberRole(member.user_id, e.target.value || null)
                            }
                          >
                            <MenuItem value="">
                              <em>{t('admin.organizations.noRole')}</em>
                            </MenuItem>
                            {roleTemplates.map((template) => (
                              <MenuItem key={template.id} value={template.id}>
                                {template.display_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t('admin.organizations.tooltipRemoveMember')}>
                          <IconButton
                            size="small"
                            aria-label={t('admin.organizations.ariaRemoveMember')}
                            onClick={() => handleRemoveMember(member.user_id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersOrg(null)}>{t('admin.organizations.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.organizations.addMemberTitle', { name: membersOrg?.name })}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Autocomplete
              options={allUsers.filter((u) => !members.some((m) => m.user_id === u.id))}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={selectedUser}
              onChange={(_, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('admin.organizations.labelSelectUser')}
                  placeholder={t('admin.organizations.placeholderSearchUsers')}
                />
              )}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>{t('admin.organizations.labelRoleTemplate')}</InputLabel>
              <Select
                value={selectedRoleTemplateId}
                label={t('admin.organizations.labelRoleTemplate')}
                onChange={(e: SelectChangeEvent) => setSelectedRoleTemplateId(e.target.value)}
              >
                <MenuItem value="">
                  <em>{t('admin.organizations.menuNoRoleViewOnly')}</em>
                </MenuItem>
                {roleTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.display_name}
                    {template.description && (
                      <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                        - {template.description}
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberOpen(false)}>{t('admin.organizations.cancel')}</Button>
          <Button onClick={handleAddMember} variant="contained" disabled={!selectedUser}>
            {t('admin.organizations.addMember')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
