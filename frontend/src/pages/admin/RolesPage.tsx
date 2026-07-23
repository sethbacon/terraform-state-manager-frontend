import { useState, type SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import AdminIcon from '@mui/icons-material/AdminPanelSettings'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import ShieldIcon from '@mui/icons-material/Shield'
import PageHeader from '../../components/PageHeader'
import PageTitleIcon from '@mui/icons-material/Badge'
import { api, type RoleTemplate } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { AVAILABLE_SCOPES, SYSTEM_ROLE_ORDER, getScopeColor, getScopeInfo } from '../../utils/scopes'

// Scope category groupings for the per-role permission breakdown.
const SCOPE_CATEGORIES: Record<string, string[]> = {
  'State Access': ['state:read', 'state:write', 'state:transfer', 'state:drift', 'state:execute'],
  Sources: ['sources:manage'],
  Identity: ['scim:provision'],
  System: ['admin'],
}

export default function RolesPage() {
  const { t } = useTranslation()
  const [expandedRole, setExpandedRole] = useState<string | false>(false)

  const rolesQuery = useQuery<RoleTemplate[]>({
    queryKey: queryKeys.admin.roles(),
    queryFn: async () => {
      const templates = await api.listAdminRoles()
      return [...templates].sort((a, b) => {
        if (a.is_system && !b.is_system) return -1
        if (!a.is_system && b.is_system) return 1
        if (a.is_system && b.is_system) {
          return SYSTEM_ROLE_ORDER.indexOf(a.name) - SYSTEM_ROLE_ORDER.indexOf(b.name)
        }
        return a.name.localeCompare(b.name)
      })
    },
  })
  const roles = rolesQuery.data ?? []

  const handleAccordionChange = (roleId: string) => (_: SyntheticEvent, isExpanded: boolean) => {
    setExpandedRole(isExpanded ? roleId : false)
  }

  if (rolesQuery.isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress aria-label={t('common.loading')} />
      </Box>
    )
  }

  return (
    <Box aria-busy={rolesQuery.isLoading} aria-live="polite">
      <PageHeader icon={<PageTitleIcon />} title={t('admin.roles.title')} description={t('admin.roles.subtitle')} />

      {rolesQuery.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('admin.roles.loadError')}
        </Alert>
      )}

      {/* Scope Reference */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {t('admin.roles.availableScopesReference')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('admin.roles.scopesDefine')}
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>{t('admin.roles.thScope')}</strong>
                </TableCell>
                <TableCell>
                  <strong>{t('admin.roles.thDescription')}</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {AVAILABLE_SCOPES.map((scope) => (
                <TableRow key={scope.value}>
                  <TableCell>
                    <Chip label={scope.label} size="small" color={getScopeColor(scope.value)} variant="outlined" />
                  </TableCell>
                  <TableCell>{scope.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Roles List */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('admin.roles.roleTemplates')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {t('admin.roles.clickRole')}
        </Typography>

        {roles.length === 0 ? (
          <Alert severity="info">{t('admin.roles.noRoles')}</Alert>
        ) : (
          <Box>
            {roles.map((role) => (
              <Accordion
                key={role.id}
                expanded={expandedRole === role.id}
                onChange={handleAccordionChange(role.id)}
                sx={{ mb: 1, '&:before': { display: 'none' }, border: 1, borderColor: 'divider' }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ backgroundColor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50') }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%', pr: 2 }}>
                    {role.name === 'admin' ? (
                      <AdminIcon color="error" />
                    ) : role.is_system ? (
                      <LockIcon color="action" />
                    ) : (
                      <ShieldIcon color="primary" />
                    )}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'medium' }}>
                        {role.display_name}
                      </Typography>
                      {role.is_system && (
                        <Chip
                          label={t('admin.roles.systemChip')}
                          size="small"
                          color="default"
                          sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {t('admin.roles.scopeCount', { count: role.scopes.length })}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 2 }}>
                  {role.description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {role.description}
                    </Typography>
                  )}

                  <Typography variant="subtitle2" gutterBottom>
                    {t('admin.roles.assignedScopes')}
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
                    {role.scopes.map((scope) => {
                      const scopeInfo = getScopeInfo(scope)
                      return (
                        <Tooltip key={scope} title={scopeInfo.description} arrow>
                          <Chip label={scopeInfo.label} size="small" color={getScopeColor(scope)} />
                        </Tooltip>
                      )
                    })}
                  </Stack>

                  {/* Scope breakdown by category */}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    {t('admin.roles.permissionsByCategory')}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(SCOPE_CATEGORIES).map(([category, categoryScopes]) => {
                          const matchingScopes = role.scopes.filter(
                            (s) => categoryScopes.includes(s) || s === 'admin',
                          )
                          const hasAdminScope = role.scopes.includes('admin')
                          return (
                            <TableRow key={category}>
                              <TableCell sx={{ fontWeight: 'medium', width: 200 }}>{category}</TableCell>
                              <TableCell>
                                {hasAdminScope && category !== 'System' ? (
                                  <Chip
                                    label={t('admin.roles.fullAccessViaAdmin')}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                ) : matchingScopes.length > 0 ? (
                                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                    {matchingScopes.map((scope) => {
                                      const scopeInfo = getScopeInfo(scope)
                                      return (
                                        <Chip
                                          key={scope}
                                          label={scopeInfo.label}
                                          size="small"
                                          color={getScopeColor(scope)}
                                          variant="outlined"
                                        />
                                      )
                                    })}
                                  </Stack>
                                ) : (
                                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                    {t('admin.roles.noAccess')}
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Metadata */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('admin.roles.metaRoleId')}: {role.id} | {t('admin.roles.metaCreated')}:{' '}
                      {new Date(role.created_at).toLocaleDateString()}
                      {role.updated_at !== role.created_at && (
                        <>
                          {' '}
                          | {t('admin.roles.metaUpdated')}: {new Date(role.updated_at).toLocaleDateString()}
                        </>
                      )}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
