import type { AnalysisResult, DriftRecordsResponse, DriftRun, EditStateResponse } from './api'

/**
 * Lightweight runtime validation of API response shapes at the service boundary (#217).
 *
 * The app deliberately has no schema-validation library; these hand-written guards
 * assert only the structurally-critical fields — the arrays that render code consumes
 * via `.map`/`.slice` and the key scalars — so a malformed, partial, or version-skewed
 * backend payload surfaces as a handled query-error state (react-query `isError`, with
 * the per-route ErrorBoundary as a backstop) instead of an uncaught `TypeError` during
 * render. They are intentionally not exhaustive schemas: unknown/extra fields pass
 * through untouched and optional fields may be absent.
 */
export class MalformedResponseError extends Error {
  /** The response family that failed validation (e.g. "state analysis"). */
  readonly context: string

  constructor(context: string, detail: string) {
    super(`Malformed ${context} response from server: ${detail}`)
    this.name = 'MalformedResponseError'
    this.context = context
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(context: string, path: string, value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new MalformedResponseError(context, `expected "${path}" to be an object`)
  }
  return value
}

function requireArray(context: string, path: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new MalformedResponseError(context, `expected "${path}" to be an array`)
  }
  return value
}

/**
 * Validate a state-analysis response. The analysis panel renders the resource-type,
 * provider, and module breakdowns via array methods, so a non-array in any of those
 * fields (the concrete failure this finding cites) would throw during render.
 */
export function validateAnalysisResult(raw: unknown): AnalysisResult {
  const ctx = 'state analysis'
  const root = requireObject(ctx, 'response', raw)
  const analysis = requireObject(ctx, 'analysis', root.analysis)
  requireArray(ctx, 'analysis.resource_types', analysis.resource_types)
  requireArray(ctx, 'analysis.providers', analysis.providers)
  requireArray(ctx, 'analysis.modules', analysis.modules)
  return raw as AnalysisResult
}

/**
 * A drift summary is optional, but when present it must be an array whose items each
 * carry an `actions` string array (rendered per changed resource). Guarding it keeps a
 * malformed summary from throwing while the drift table renders.
 */
function validateDriftSummary(context: string, path: string, summary: unknown): void {
  if (summary === undefined || summary === null) return
  const items = requireArray(context, path, summary)
  items.forEach((item, i) => {
    const record = requireObject(context, `${path}[${i}]`, item)
    requireArray(context, `${path}[${i}].actions`, record.actions)
  })
}

/** Validate the drift-runs listing (each run's optional summary/drift_summary). */
export function validateDriftRunsResponse(raw: unknown): { runs: DriftRun[]; total?: number } {
  const ctx = 'drift runs'
  const root = requireObject(ctx, 'response', raw)
  const runs = requireArray(ctx, 'runs', root.runs)
  runs.forEach((run, i) => {
    const record = requireObject(ctx, `runs[${i}]`, run)
    validateDriftSummary(ctx, `runs[${i}].summary`, record.summary)
    // drift_summary (Phase 5) is the resource_drift-derived parallel to
    // summary — same shape, same optional/omitted-when-empty contract.
    validateDriftSummary(ctx, `runs[${i}].drift_summary`, record.drift_summary)
  })
  return raw as { runs: DriftRun[]; total?: number }
}

/** Validate the drift-records listing (each record's optional summary/drift_summary). */
export function validateDriftRecordsResponse(raw: unknown): DriftRecordsResponse {
  const ctx = 'drift records'
  const root = requireObject(ctx, 'response', raw)
  const records = requireArray(ctx, 'records', root.records)
  records.forEach((rec, i) => {
    const record = requireObject(ctx, `records[${i}]`, rec)
    validateDriftSummary(ctx, `records[${i}].summary`, record.summary)
    validateDriftSummary(ctx, `records[${i}].drift_summary`, record.drift_summary)
  })
  return raw as DriftRecordsResponse
}

/** Validate a state-edit response: the status label and the resulting serial. */
export function validateEditStateResponse(raw: unknown): EditStateResponse {
  const ctx = 'state edit'
  const root = requireObject(ctx, 'response', raw)
  if (typeof root.status !== 'string') {
    throw new MalformedResponseError(ctx, 'expected "status" to be a string')
  }
  if (typeof root.serial !== 'number') {
    throw new MalformedResponseError(ctx, 'expected "serial" to be a number')
  }
  return raw as EditStateResponse
}
