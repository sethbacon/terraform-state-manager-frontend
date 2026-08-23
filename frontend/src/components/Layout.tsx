import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useTranslation } from 'react-i18next'
import { OrganizationPicker, SuiteLayout } from '@4cloudguru/cloud-suite-ui'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { homeItem, navGroups, apiDocsItem, adminDashboardItem } from '../navigation'
import { useHelp } from '../contexts/HelpContext'
import HelpPanel, { HELP_PANEL_WIDTH } from './HelpPanel'
import AboutModal from './AboutModal'
import AdminBreadcrumbs from './AdminBreadcrumbs'
import CommandPalette from './CommandPalette'
import { SuiteSwitcher } from './SuiteSwitcher'

const GROUPS_STORAGE_KEY = 'tsm-nav-groups-open'

/**
 * Application shell. A thin wrapper over the shared SuiteLayout that injects the
 * app's navigation, the combined Settings (theme + language) menu, a Support
 * menu (context help + about), the command palette, admin breadcrumbs, and the
 * route-aware help panel. The AppBar, drawer, active-nav styling, account menu,
 * skip link, lazy-route Suspense boundary, and session-expiry warning all come
 * from SuiteLayout.
 */
export default function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { helpOpen, openHelp } = useHelp()

  const [supportAnchor, setSupportAnchor] = useState<null | HTMLElement>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K toggles the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The admin Dashboard renders standalone at the top of the grouped section —
  // just under the API Docs separator, above the Main group.
  const groups = navGroups.map((g) =>
    g.key === 'main' ? { ...g, standaloneItem: adminDashboardItem } : g,
  )

  // API docs uses the full content width (its two-column swagger layout); every
  // other route is capped at lg to line up with the registry baseline.
  const isApiDocs = location.pathname === apiDocsItem.path

  return (
    <>
      <SuiteLayout
        homeItem={homeItem}
        primaryNavItems={[apiDocsItem]}
        navGroups={groups}
        groupStateStorageKey={GROUPS_STORAGE_KEY}
        suiteSwitcher={<SuiteSwitcher />}
        settingsMenu
        languages={SUPPORTED_LANGUAGES.map((l) => ({ code: l.code, label: l.label }))}
        maxWidth={isApiDocs ? false : 'lg'}
        contentHeader={<AdminBreadcrumbs />}
        contentInsetRight={helpOpen ? HELP_PANEL_WIDTH : 0}
        appBarActions={
          <>
            {/* Renders nothing for a caller who belongs to one organization, so a
                single-organization deployment sees no new UI. For a caller in
                several it is the only way to name the organization a write
                belongs to — without it the backend refuses every stamped write
                with "name the organization to act in", and the client has no way
                to comply. */}
            <OrganizationPicker
              tooltip={t('organization.pickerTooltip')}
              unselectedLabel={t('organization.unselected')}
            />
            <Tooltip title={t('commandPalette.hint')}>
              <IconButton
                color="inherit"
                onClick={() => setPaletteOpen(true)}
                aria-label={t('commandPalette.openButton')}
              >
                <SearchIcon />
              </IconButton>
            </Tooltip>
          </>
        }
        supportMenu={
          <>
            <Tooltip title={t('support.title')}>
              <IconButton
                color="inherit"
                onClick={(e) => setSupportAnchor(e.currentTarget)}
                aria-label={t('support.title')}
                aria-haspopup="true"
                aria-controls={supportAnchor ? 'support-menu' : undefined}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Menu
              id="support-menu"
              anchorEl={supportAnchor}
              open={Boolean(supportAnchor)}
              onClose={() => setSupportAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  setSupportAnchor(null)
                  openHelp()
                }}
              >
                <ListItemIcon>
                  <HelpOutlineIcon fontSize="small" />
                </ListItemIcon>
                {t('support.contextHelp')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSupportAnchor(null)
                  setAboutOpen(true)
                }}
              >
                <ListItemIcon>
                  <InfoOutlinedIcon fontSize="small" />
                </ListItemIcon>
                {t('about.title')}
              </MenuItem>
            </Menu>
          </>
        }
        commandPalette={<CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
      />
      <HelpPanel />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
