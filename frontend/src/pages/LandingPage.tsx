import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Box, Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material'
import LoginIcon from '@mui/icons-material/Login'
import DescriptionIcon from '@mui/icons-material/Description'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StorageIcon from '@mui/icons-material/Storage'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ScienceIcon from '@mui/icons-material/Science'
import ScheduleIcon from '@mui/icons-material/Schedule'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useAuth } from '../contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import DashboardCard from '../components/DashboardCard'

interface Feature {
  key: string
  icon: ReactNode
  path: string
}

const FEATURES: Feature[] = [
  { key: 'sources', icon: <StorageIcon sx={{ fontSize: 40 }} />, path: '/sources' },
  { key: 'drift', icon: <CompareArrowsIcon sx={{ fontSize: 40 }} />, path: '/drift' },
  { key: 'versionLab', icon: <ScienceIcon sx={{ fontSize: 40 }} />, path: '/version-lab' },
  { key: 'schedules', icon: <ScheduleIcon sx={{ fontSize: 40 }} />, path: '/schedules' },
  { key: 'reports', icon: <AssessmentIcon sx={{ fontSize: 40 }} />, path: '/reports' },
  { key: 'transfer', icon: <SwapHorizIcon sx={{ fontSize: 40 }} />, path: '/transfer' },
]

/**
 * Public marketing landing at `/`. Visible to anonymous visitors (with sign-in
 * CTAs) and to authenticated users (with a prominent "Go to dashboard" CTA — we
 * intentionally don't auto-redirect signed-in users away from the landing).
 */
export default function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Feature cards deep-link into the app for signed-in users; anonymous visitors
  // are routed to sign in first.
  const openFeature = (path: string) => navigate(isAuthenticated ? path : '/login')

  // Signed-in users get a live estate summary (the data is private, so anonymous
  // visitors see only the hero + feature cards below).
  const { data: overview } = useQuery({
    queryKey: ['dashboard', 'overview', 'landing'],
    queryFn: () => api.getDashboardOverview(),
    enabled: isAuthenticated,
  })

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #5C4EE5 0%, #00D9C0 100%)',
          color: 'common.white',
          borderRadius: 2,
          px: { xs: 3, md: 6 },
          py: { xs: 6, md: 8 },
          mb: 6,
        }}
      >
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1.5 }}>
          {t('landing.heroTitle')}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 4, maxWidth: 720 }}>
          {t('landing.heroSubtitle')}
        </Typography>
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <Button
              variant="contained"
              size="large"
              startIcon={<DashboardIcon />}
              onClick={() => navigate('/admin')}
              sx={{ backgroundColor: 'common.white', color: '#5C4EE5', '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' } }}
            >
              {t('landing.goToDashboard')}
            </Button>
          ) : (
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              component={RouterLink}
              to="/login"
              sx={{ backgroundColor: 'common.white', color: '#5C4EE5', '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' } }}
            >
              {t('landing.signIn')}
            </Button>
          )}
          <Button
            variant="outlined"
            size="large"
            startIcon={<DescriptionIcon />}
            component={RouterLink}
            to="/api-docs"
            sx={{
              borderColor: 'rgba(255,255,255,0.7)',
              color: 'common.white',
              '&:hover': { borderColor: 'common.white', backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            {t('landing.apiDocs')}
          </Button>
        </Stack>
      </Box>

      {isAuthenticated && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            {t('landing.estateTitle')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            }}
          >
            <DashboardCard
              label={t('landing.estate.sources')}
              value={overview?.sources ?? '\u2014'}
              to="/sources"
            />
            <DashboardCard
              label={t('landing.estate.states')}
              value={overview?.states ?? '\u2014'}
              to="/sources"
            />
            <DashboardCard
              label={t('landing.estate.rum')}
              hint={t('landing.estate.rumHint')}
              value={overview?.rum ?? '\u2014'}
              to="/reports"
            />
            <DashboardCard
              label={t('landing.estate.totalResources')}
              value={overview?.total_resources ?? '\u2014'}
              to="/reports"
            />
          </Box>
        </Box>
      )}

      {/* Feature cards */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        {t('landing.featuresTitle')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
          mb: 8,
        }}
      >
        {FEATURES.map((f) => (
          <Card
            key={f.key}
            variant="outlined"
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' },
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Box sx={{ color: 'primary.main', mb: 1.5 }}>{f.icon}</Box>
              <Typography variant="h6" gutterBottom>
                {t(`landing.features.${f.key}.title`)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`landing.features.${f.key}.desc`)}
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => openFeature(f.path)}>
                {isAuthenticated ? t('landing.open') : t('landing.signInToUse')}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Getting started */}
      <Box sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : 'grey.100'), borderRadius: 2, p: { xs: 3, md: 4 }, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          {t('landing.gettingStarted')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {t('landing.step1Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {isAuthenticated ? t('landing.step1DescAuth') : t('landing.step1DescUnauth')}
              </Typography>
              {!isAuthenticated && (
                <Button variant="contained" size="small" startIcon={<LoginIcon />} component={RouterLink} to="/login">
                  {t('landing.signIn')}
                </Button>
              )}
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {t('landing.step2Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('landing.step2Desc')}
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {t('landing.step3Title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('landing.step3Desc')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}
