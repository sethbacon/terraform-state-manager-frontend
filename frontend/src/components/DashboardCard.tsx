import type { ReactNode } from 'react'
import { Card, CardContent, Tooltip, Typography } from '@mui/material'

export interface DashboardCardProps {
  label: string
  value: ReactNode
  /** Optional tooltip on the label (e.g. an acronym expansion). */
  hint?: string
}

/** Compact metric card for the dashboard's stat grid. */
export default function DashboardCard({ label, value, hint }: DashboardCardProps) {
  const labelEl = (
    <Typography variant="overline" color="text.secondary" sx={hint ? { cursor: 'help' } : undefined}>
      {label}
    </Typography>
  )
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5 }}>
        {hint ? <Tooltip title={hint}>{labelEl}</Tooltip> : labelEl}
        <Typography variant="h5">{value}</Typography>
      </CardContent>
    </Card>
  )
}
