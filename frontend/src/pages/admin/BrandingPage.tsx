import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PaletteIcon from '@mui/icons-material/Palette'
import PageHeader from '../../components/PageHeader'
import { api, type UIThemeConfig } from '../../services/api'
import { queryKeys } from '../../services/queryKeys'

import { extractApiError as apiErr } from '../../utils/apiError'

// Mirrors the backend gate (ui_theme.go): hex or rgb()/hsl() notation — what
// MUI's decomposeColor can parse. Validated here too so the admin gets field-
// level feedback instead of a submit error.
const COLOR_RE = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|rgba|hsl|hsla)\([0-9a-z.,%\s/]+\))$/i

// URLs must be https or root-relative (http only for localhost development).
function isValidAssetUrl(v: string): boolean {
  const lower = v.toLowerCase()
  return (
    lower.startsWith('https://') ||
    (v.startsWith('/') && !v.startsWith('//')) ||
    lower.startsWith('http://localhost') ||
    lower.startsWith('http://127.0.0.1')
  )
}

type Field = {
  key: keyof UIThemeConfig
  labelKey: string
  helperKey: string
  kind: 'text' | 'color' | 'url'
}

const FIELDS: Field[] = [
  { key: 'product_name', labelKey: 'pages.branding.productName', helperKey: 'pages.branding.productNameHelp', kind: 'text' },
  { key: 'primary_color', labelKey: 'pages.branding.primaryColor', helperKey: 'pages.branding.colorHelp', kind: 'color' },
  { key: 'secondary_color_light', labelKey: 'pages.branding.secondaryColorLight', helperKey: 'pages.branding.colorHelp', kind: 'color' },
  { key: 'secondary_color_dark', labelKey: 'pages.branding.secondaryColorDark', helperKey: 'pages.branding.colorHelp', kind: 'color' },
  { key: 'logo_url', labelKey: 'pages.branding.logoUrl', helperKey: 'pages.branding.urlHelp', kind: 'url' },
  { key: 'favicon_url', labelKey: 'pages.branding.faviconUrl', helperKey: 'pages.branding.urlHelp', kind: 'url' },
  { key: 'login_hero_url', labelKey: 'pages.branding.loginHeroUrl', helperKey: 'pages.branding.urlHelp', kind: 'url' },
]

function fieldError(f: Field, value: string): boolean {
  if (!value) return false
  if (f.kind === 'color') return !COLOR_RE.test(value)
  if (f.kind === 'url') return !isValidAssetUrl(value)
  return value.length > 100
}

/**
 * Admin whitelabel branding: product name, palette colors, and logo/favicon/
 * login-hero URLs, persisted via PUT /api/v1/admin/ui/theme and served publicly
 * at GET /api/v1/ui/theme (the theme provider consumes it at app start, so a
 * saved change applies on the next full reload).
 */
export default function BrandingPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<UIThemeConfig>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const themeQuery = useQuery({ queryKey: queryKeys.ui.theme(), queryFn: api.getUITheme })
  useEffect(() => {
    if (themeQuery.data) setForm(themeQuery.data)
  }, [themeQuery.data])

  const save = useMutation({
    mutationFn: (cfg: UIThemeConfig) => api.updateUITheme(cfg),
    onSuccess: (_data, cfg) => {
      setForm(cfg)
      setSaved(true)
      setError(null)
    },
    onError: (e) => {
      setSaved(false)
      setError(apiErr(e))
    },
  })

  const hasInvalidField = FIELDS.some((f) => fieldError(f, (form[f.key] ?? '') as string))

  // Empty strings are dropped so the stored config only carries real overrides.
  const compact = (cfg: UIThemeConfig): UIThemeConfig =>
    Object.fromEntries(Object.entries(cfg).filter(([, v]) => v !== '' && v !== undefined))

  return (
    <Box>
      <PageHeader
        icon={<PaletteIcon />}
        title={t('pages.branding.title')}
        description={t('pages.branding.description')}
      />

      {themeQuery.isLoading && <CircularProgress size={24} />}
      {themeQuery.isError && <Alert severity="error">{t('pages.branding.loadFailed')}</Alert>}

      {!themeQuery.isLoading && !themeQuery.isError && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2} sx={{ maxWidth: 560 }}>
              {FIELDS.map((f) => {
                const value = (form[f.key] ?? '') as string
                const invalid = fieldError(f, value)
                return (
                  <TextField
                    key={f.key}
                    size="small"
                    label={t(f.labelKey)}
                    value={value}
                    error={invalid}
                    helperText={invalid ? t(f.helperKey) : undefined}
                    placeholder={f.kind === 'color' ? '#0a6e31' : undefined}
                    onChange={(e) => {
                      setSaved(false)
                      setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }}
                    fullWidth
                  />
                )
              })}

              {error && <Alert severity="error">{error}</Alert>}
              {saved && (
                <Alert
                  severity="success"
                  action={
                    <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                      {t('pages.branding.reloadNow')}
                    </Button>
                  }
                >
                  {t('pages.branding.savedReloadHint')}
                </Alert>
              )}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={hasInvalidField || save.isPending}
                  onClick={() => save.mutate(compact(form))}
                >
                  {t('common.save')}
                </Button>
                <Button
                  color="inherit"
                  disabled={save.isPending}
                  onClick={() => save.mutate({})}
                >
                  {t('pages.branding.resetDefaults')}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t('pages.branding.securityNote')}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
