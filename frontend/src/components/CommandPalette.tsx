import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Box, Dialog, Typography, useTheme } from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { allNavItems, type NavItem } from '../navigation'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const { hasScope } = useAuth()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const items = useMemo<NavItem[]>(
    () => allNavItems.filter((i) => i.scope === null || hasScope(i.scope)),
    [hasScope],
  )

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
      slotProps={{ paper: { sx: { overflow: 'hidden' } } }}
    >
      <Command label={t('commandPalette.title')} shouldFilter>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1.5 }}>
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={t('commandPalette.placeholder')}
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
          <Command.List style={{ maxHeight: 400, overflowY: 'auto', padding: '0.5rem 0' }}>
            <Command.Empty>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('commandPalette.empty')}
                </Typography>
              </Box>
            </Command.Empty>

            <Command.Group heading={t('commandPalette.groups.navigation')}>
              {items.map((item) => {
                const label = t(item.labelKey) as string
                return (
                  <Command.Item key={item.path} value={`${label} ${item.path}`} onSelect={() => go(item.path)}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 3,
                        py: 1,
                        cursor: 'pointer',
                        '&[data-selected="true"], &:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="body2">{label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {item.path}
                      </Typography>
                    </Box>
                  </Command.Item>
                )
              })}
            </Command.Group>
          </Command.List>
        </Box>
      </Command>
    </Dialog>
  )
}
