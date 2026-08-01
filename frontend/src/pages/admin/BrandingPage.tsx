import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Alert, Box } from '@mui/material'
import PaletteIcon from '@mui/icons-material/Palette'
import { BrandingSettingsCard, type UIThemeConfig } from '@sethbacon/terraform-suite-ui'
import PageHeader from '../../components/PageHeader'
import { api } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'
import { extractApiError as apiErr } from '../../utils/apiError'
import { isSafeExternalUrl } from '../../utils/externalUrl'

// Mirrors the backend gate (ui_theme.go): hex or rgb()/hsl() notation — what
// MUI's decomposeColor can parse. Validated here too so the admin gets field-
// level feedback instead of a submit error.
const COLOR_RE = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|rgba|hsl|hsla)\([0-9a-z.,%\s/]+\))$/i

/**
 * Admin whitelabel branding: product name, palette colors, and logo/favicon/
 * login-hero URLs, persisted via PUT /api/v1/admin/ui/theme and served publicly
 * at GET /api/v1/ui/theme (the theme provider consumes it at app start, so a
 * saved change applies on the next full reload).
 */
export default function BrandingPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const themeQuery = useQuery({ queryKey: queryKeys.ui.theme(), queryFn: api.getUITheme })

  const save = useMutation({
    mutationFn: (cfg: UIThemeConfig) => api.updateUITheme(cfg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.ui.theme() }),
  })

  return (
    <Box>
      <PageHeader
        icon={<PaletteIcon />}
        title={t('pages.branding.title')}
        description={t('pages.branding.description')}
      />

      {themeQuery.isError ? (
        <Alert severity="error">{t('pages.branding.loadFailed')}</Alert>
      ) : (
        <BrandingSettingsCard
          value={themeQuery.data ?? {}}
          isLoading={themeQuery.isLoading}
          validators={{ isValidColor: (v) => COLOR_RE.test(v), isValidUrl: isSafeExternalUrl }}
          // Each field supplies only errorText: these strings read as
          // corrections, and colorHelp/urlHelp are each shared by several
          // fields, so showing them unconditionally would put the same line on
          // screen three times.
          strings={{
            fields: {
              product_name: {
                label: t('pages.branding.productName'),
                errorText: t('pages.branding.productNameHelp'),
              },
              primary_color: {
                label: t('pages.branding.primaryColor'),
                errorText: t('pages.branding.colorHelp'),
              },
              secondary_color_light: {
                label: t('pages.branding.secondaryColorLight'),
                errorText: t('pages.branding.colorHelp'),
              },
              secondary_color_dark: {
                label: t('pages.branding.secondaryColorDark'),
                errorText: t('pages.branding.colorHelp'),
              },
              logo_url: {
                label: t('pages.branding.logoUrl'),
                errorText: t('pages.branding.urlHelp'),
              },
              favicon_url: {
                label: t('pages.branding.faviconUrl'),
                errorText: t('pages.branding.urlHelp'),
              },
              login_hero_url: {
                label: t('pages.branding.loginHeroUrl'),
                errorText: t('pages.branding.urlHelp'),
              },
            },
            resetDefaults: t('pages.branding.resetDefaults'),
            savedReloadHint: t('pages.branding.savedReloadHint'),
            reloadNow: t('pages.branding.reloadNow'),
            securityNote: t('pages.branding.securityNote'),
          }}
          onSave={async (cfg) => {
            // The card renders Error.message; the backend's rejection is an
            // axios error, so unwrap it here or its validation detail is lost.
            try {
              await save.mutateAsync(cfg)
            } catch (e) {
              throw new Error(apiErr(e))
            }
          }}
        />
      )}
    </Box>
  )
}
