import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Card, CardActionArea, CardContent, Tooltip, Typography } from '@mui/material'

export interface DashboardCardProps {
  label: string
  value: ReactNode
  /** Optional tooltip on the label (e.g. an acronym expansion). */
  hint?: string
  /** Optional route — makes the whole card a clickable link. */
  to?: string
}

/** Compact metric card for the dashboard's stat grid. */
export default function DashboardCard({ label, value, hint, to }: DashboardCardProps) {
  const labelEl = (
    <Typography variant="overline" color="text.secondary" sx={hint ? { cursor: 'help' } : undefined}>
      {label}
    </Typography>
  )
  const content = (
    <CardContent sx={{ py: 1.5 }}>
      {hint ? <Tooltip title={hint}>{labelEl}</Tooltip> : labelEl}
      <Typography variant="h5">{value}</Typography>
    </CardContent>
  )
  return (
    <Card variant="outlined">
      {to ? (
        <CardActionArea component={RouterLink} to={to}>
          {content}
        </CardActionArea>
      ) : (
        content
      )}
    </Card>
  )
}
