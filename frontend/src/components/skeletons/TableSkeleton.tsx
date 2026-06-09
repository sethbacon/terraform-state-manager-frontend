import { Skeleton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'

export interface TableSkeletonProps {
  rows?: number
  columns?: number
}

/** Placeholder for a data table while its query is loading. */
export default function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <Table size="small" aria-hidden="true" data-testid="table-skeleton">
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton width="60%" />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((_, c) => (
              <TableCell key={c}>
                <Skeleton />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
