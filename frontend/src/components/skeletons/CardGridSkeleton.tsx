import { Box, Card, CardContent, Skeleton } from '@mui/material'

export interface CardGridSkeletonProps {
  count?: number
  minWidth?: number
}

/** Placeholder grid of cards while a query is loading (replaces bare spinners). */
export default function CardGridSkeleton({ count = 6, minWidth = 140 }: CardGridSkeletonProps) {
  return (
    <Box
      aria-hidden="true"
      data-testid="card-grid-skeleton"
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} variant="outlined">
          <CardContent sx={{ py: 1.5 }}>
            <Skeleton width="50%" />
            <Skeleton width="80%" height={32} />
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
