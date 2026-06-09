import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material'
import { api } from '../services/api'
import { queryKeys } from '../services/queryKeys'

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

/**
 * DashboardPage proves the frontend ↔ backend wiring by reading the backend's
 * /health and /api/v1/version endpoints. It becomes the real overview (RUM,
 * resources, providers, recent runs) once those features land in later phases.
 */
export default function DashboardPage() {
  const versionQuery = useQuery({ queryKey: queryKeys.system.version, queryFn: api.getVersion })
  const healthQuery = useQuery({ queryKey: queryKeys.system.health, queryFn: api.getHealth })

  const backendUnreachable = versionQuery.isError || healthQuery.isError
  const loading = versionQuery.isLoading || healthQuery.isLoading

  const healthy = healthQuery.data?.status === 'ok'

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Terraform State Manager — Phase 0 scaffold. Frontend v{__APP_VERSION__}.
      </Typography>

      {loading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <CircularProgress size={18} />
          <Typography color="text.secondary">Contacting backend…</Typography>
        </Stack>
      )}

      {backendUnreachable && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Backend is unreachable. Start it with <code>make run</code> (or the Docker Compose stack) and
          ensure it is listening on <code>http://localhost:8080</code>.
        </Alert>
      )}

      {!loading && !backendUnreachable && (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}
        >
          <StatCard
            label="Backend status"
            value={
              <Chip
                label={healthy ? 'Healthy' : (healthQuery.data?.status ?? 'unknown')}
                color={healthy ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <StatCard label="Backend version" value={versionQuery.data?.version ?? '—'} />
          <StatCard label="Build date" value={versionQuery.data?.build_date ?? '—'} />
        </Box>
      )}
    </Box>
  )
}
