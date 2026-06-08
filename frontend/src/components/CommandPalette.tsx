import React from 'react'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Box, Dialog, Typography, useTheme } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'

export interface CommandPaletteNavItem {
  label: string
  path: string
  /** If set, the entry is hidden unless the user has the scope (or 'admin'). */
  scope?: string | null
  group: 'Navigation' | 'Admin'
  keywords?: string[]
}

/** Default navigation commands. Exported for unit tests. */
export const defaultCommands: CommandPaletteNavItem[] = [
  { label: 'Home', path: '/', group: 'Navigation' },
  { label: 'State Files', path: '/workspaces', scope: 'sources:read', group: 'Navigation' },
  { label: 'Analysis', path: '/analysis', scope: 'analysis:read', group: 'Navigation' },
  { label: 'Backups', path: '/backups', scope: 'backups:read', group: 'Navigation' },
  { label: 'Migrations', path: '/migrations', scope: 'migrations:read', group: 'Navigation' },
  { label: 'Reports', path: '/reports', scope: 'reports:read', group: 'Navigation' },
  { label: 'Alerts', path: '/alerts', scope: 'alerts:admin', group: 'Navigation' },
  { label: 'Compliance', path: '/compliance', scope: 'compliance:read', group: 'Navigation' },
  { label: 'State Sources', path: '/sources', scope: 'sources:write', group: 'Navigation' },
  { label: 'Scheduler', path: '/scheduler', scope: 'scheduler:admin', group: 'Navigation' },
  { label: 'API Docs', path: '/api-docs', group: 'Navigation', keywords: ['documentation', 'swagger'] },
  { label: 'Admin Dashboard', path: '/admin/dashboard', scope: 'admin', group: 'Admin' },
  { label: 'Users', path: '/admin/users', scope: 'users:read', group: 'Admin' },
  {
    label: 'Organizations',
    path: '/admin/organizations',
    scope: 'organizations:read',
    group: 'Admin',
  },
  { label: 'Roles', path: '/admin/roles', scope: 'admin', group: 'Admin' },
  { label: 'API Keys', path: '/admin/api-keys', group: 'Admin' },
  { label: 'OIDC Settings', path: '/admin/oidc', scope: 'admin', group: 'Admin' },
  { label: 'Audit Logs', path: '/admin/audit-logs', scope: 'audit:read', group: 'Admin' },
]

export function filterByScope(
  items: CommandPaletteNavItem[],
  allowedScopes: string[],
): CommandPaletteNavItem[] {
  if (allowedScopes.includes('admin')) return items
  return items.filter((item) => !item.scope || allowedScopes.includes(item.scope))
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { allowedScopes, isAuthenticated } = useAuth()

  const [search, setSearch] = React.useState('')

  // Reset on open/close.
  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const visibleNav = React.useMemo(
    () => filterByScope(defaultCommands, allowedScopes),
    [allowedScopes],
  )
  const navigation = visibleNav.filter((i) => i.group === 'Navigation')
  const admin = isAuthenticated ? visibleNav.filter((i) => i.group === 'Admin') : []

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="command-palette"
      slotProps={{
        paper: { sx: { overflow: 'hidden' } },
      }}
    >
      <Command label={t('commandPalette.title')} shouldFilter>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: 1.5,
          }}
        >
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={t('commandPalette.searchPlaceholder')}
            data-testid="command-palette-input"
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: theme.palette.text.primary,
              fontSize: '1rem',
              padding: '0.5rem',
            }}
          />
        </Box>
        <Box
          sx={{
            '& [cmdk-group-heading]': {
              px: 3,
              py: 0.75,
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            },
          }}
        >
          <Command.List
            style={{
              maxHeight: 400,
              overflowY: 'auto',
              padding: '0.5rem 0',
            }}
          >
            <Command.Empty>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {t('commandPalette.empty')}
                </Typography>
              </Box>
            </Command.Empty>

            {navigation.length > 0 && (
              <Command.Group heading={t('commandPalette.groups.navigation')}>
                {navigation.map((item) => (
                  <PaletteItem
                    key={item.path}
                    value={`nav-${item.path} ${item.label} ${item.keywords?.join(' ') ?? ''}`}
                    label={item.label}
                    hint={item.path}
                    onSelect={() => go(item.path)}
                  />
                ))}
              </Command.Group>
            )}

            {admin.length > 0 && (
              <Command.Group heading={t('commandPalette.groups.admin')}>
                {admin.map((item) => (
                  <PaletteItem
                    key={item.path}
                    value={`admin-${item.path} ${item.label} ${item.keywords?.join(' ') ?? ''}`}
                    label={item.label}
                    hint={item.path}
                    onSelect={() => go(item.path)}
                  />
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Box>
      </Command>
    </Dialog>
  )
}

interface PaletteItemProps {
  value: string
  label: string
  hint?: string
  onSelect: () => void
}

const PaletteItem: React.FC<PaletteItemProps> = ({ value, label, hint, onSelect }) => {
  return (
    <Command.Item value={value} onSelect={onSelect}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 3,
          py: 1,
          cursor: 'pointer',
          '&[data-selected="true"], &:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Typography variant="body2">{label}</Typography>
        {hint && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
            }}
          >
            {hint}
          </Typography>
        )}
      </Box>
    </Command.Item>
  )
}

export default CommandPalette
