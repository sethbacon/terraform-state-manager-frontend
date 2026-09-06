import { describe, expect, it } from 'vitest'
import {
  MalformedResponseError,
  validateAnalysisResult,
  validateDriftRecordsResponse,
  validateDriftRunsResponse,
  validateEditStateResponse,
} from './validation'

// A structurally valid analysis payload; individual tests corrupt one field.
const validAnalysis = {
  key: 'app.tfstate',
  size: 2048,
  analysis: {
    terraform_version: '1.9.5',
    serial: 7,
    lineage: 'lin-1',
    total_resources: 3,
    managed_resources: 3,
    data_sources: 0,
    null_resources: 0,
    rum: 3,
    resource_types: [{ key: 'aws_instance', count: 2 }],
    providers: [{ key: 'aws', count: 3 }],
    modules: [],
  },
}

describe('validateAnalysisResult', () => {
  it('returns the payload unchanged when the breakdown fields are arrays', () => {
    expect(validateAnalysisResult(validAnalysis)).toBe(validAnalysis)
  })

  it('throws when the response is not an object', () => {
    expect(() => validateAnalysisResult(null)).toThrow(MalformedResponseError)
    expect(() => validateAnalysisResult('nope')).toThrow(MalformedResponseError)
    expect(() => validateAnalysisResult([])).toThrow(MalformedResponseError)
  })

  it('throws when the analysis object is missing', () => {
    expect(() => validateAnalysisResult({ key: 'k', size: 1 })).toThrow(/expected "analysis" to be an object/)
  })

  it.each(['resource_types', 'providers', 'modules'])('throws when analysis.%s is not an array', (field) => {
    const bad = { ...validAnalysis, analysis: { ...validAnalysis.analysis, [field]: null } }
    expect(() => validateAnalysisResult(bad)).toThrow(new RegExp(`expected "analysis.${field}" to be an array`))
  })

  it('tags the thrown error with the response context', () => {
    try {
      validateAnalysisResult({ analysis: { resource_types: 'x', providers: [], modules: [] } })
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(MalformedResponseError)
      expect((e as MalformedResponseError).context).toBe('state analysis')
    }
  })
})

describe('validateDriftRunsResponse', () => {
  it('accepts runs with and without summaries', () => {
    const payload = {
      runs: [
        { id: 'r1' },
        { id: 'r2', summary: [{ address: 'aws_s3_bucket.logs', actions: ['update'] }] },
      ],
      total: 2,
    }
    expect(validateDriftRunsResponse(payload)).toBe(payload)
  })

  it('accepts an empty runs array', () => {
    expect(validateDriftRunsResponse({ runs: [] })).toEqual({ runs: [] })
  })

  it('throws when runs is not an array', () => {
    expect(() => validateDriftRunsResponse({ runs: null })).toThrow(/expected "runs" to be an array/)
  })

  it('throws when a run summary is present but not an array', () => {
    expect(() => validateDriftRunsResponse({ runs: [{ id: 'r1', summary: 'oops' }] })).toThrow(
      /expected "runs\[0\].summary" to be an array/,
    )
  })

  it('throws when a summary item has a non-array actions field', () => {
    const payload = { runs: [{ id: 'r1', summary: [{ address: 'a', actions: 'update' }] }] }
    expect(() => validateDriftRunsResponse(payload)).toThrow(/expected "runs\[0\].summary\[0\].actions" to be an array/)
  })

  it('accepts runs with and without drift_summary (Phase 5, the resource_drift parallel)', () => {
    const payload = {
      runs: [
        { id: 'r1' },
        { id: 'r2', drift_summary: [{ address: 'aws_s3_bucket.logs', actions: ['update'] }] },
      ],
    }
    expect(validateDriftRunsResponse(payload)).toBe(payload)
  })

  it('throws when a run drift_summary is present but not an array', () => {
    expect(() => validateDriftRunsResponse({ runs: [{ id: 'r1', drift_summary: 'oops' }] })).toThrow(
      /expected "runs\[0\].drift_summary" to be an array/,
    )
  })
})

describe('validateDriftRecordsResponse', () => {
  it('accepts records with and without summaries', () => {
    const payload = {
      records: [{ id: 'rec1', summary: [{ address: 'aws_instance.web', actions: ['delete'] }] }],
      counts: {},
      total: 1,
    }
    expect(validateDriftRecordsResponse(payload)).toBe(payload)
  })

  it('accepts an empty records array', () => {
    expect(validateDriftRecordsResponse({ records: [], counts: {}, total: 0 })).toEqual({
      records: [],
      counts: {},
      total: 0,
    })
  })

  it('throws when records is not an array', () => {
    expect(() => validateDriftRecordsResponse({ records: {} })).toThrow(/expected "records" to be an array/)
  })

  it('throws when a record summary is malformed', () => {
    expect(() => validateDriftRecordsResponse({ records: [{ id: 'rec1', summary: {} }] })).toThrow(
      /expected "records\[0\].summary" to be an array/,
    )
  })

  it('throws when a record drift_summary is malformed (Phase 5, the resource_drift parallel)', () => {
    expect(() => validateDriftRecordsResponse({ records: [{ id: 'rec1', drift_summary: {} }] })).toThrow(
      /expected "records\[0\].drift_summary" to be an array/,
    )
  })
})

describe('validateEditStateResponse', () => {
  it('returns the payload when status and serial are well typed', () => {
    const payload = { status: 'ok', serial: 9, backup_id: 'b1' }
    expect(validateEditStateResponse(payload)).toBe(payload)
  })

  it('throws when status is not a string', () => {
    expect(() => validateEditStateResponse({ status: 1, serial: 9 })).toThrow(/expected "status" to be a string/)
  })

  it('throws when serial is not a number', () => {
    expect(() => validateEditStateResponse({ status: 'ok', serial: '9' })).toThrow(/expected "serial" to be a number/)
  })

  it('throws when the response is not an object', () => {
    expect(() => validateEditStateResponse(undefined)).toThrow(MalformedResponseError)
  })
})
