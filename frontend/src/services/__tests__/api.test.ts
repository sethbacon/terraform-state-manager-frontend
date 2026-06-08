import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

// ---------------------------------------------------------------------------
// Helpers – capture the interceptors that ApiClient registers so we can
// invoke them directly in tests without triggering real navigation.
// ---------------------------------------------------------------------------

type ReqFulfilled = (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
type ResFulfilled = (response: AxiosResponse) => AxiosResponse
type ResRejected = (error: AxiosError) => unknown

let capturedReqFulfilled: ReqFulfilled
let capturedResRejected: ResRejected
let _mockAxiosInstance: AxiosInstance

vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((fulfilled: ReqFulfilled) => {
          capturedReqFulfilled = fulfilled
        }),
      },
      response: {
        use: vi.fn((_fulfilled: ResFulfilled, rejected: ResRejected) => {
          capturedResRejected = rejected
        }),
      },
    },
  }

  return {
    default: {
      create: vi.fn(() => {
        _mockAxiosInstance = mockInstance as unknown as AxiosInstance
        return mockInstance
      }),
    },
  }
})

function getApiClient() {
  vi.resetModules()
  vi.doMock('axios', () => {
    const mockInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn((fulfilled: ReqFulfilled) => {
            capturedReqFulfilled = fulfilled
          }),
        },
        response: {
          use: vi.fn((_fulfilled: ResFulfilled, rejected: ResRejected) => {
            capturedResRejected = rejected
          }),
        },
      },
    }
    return {
      default: {
        create: vi.fn(() => {
          _mockAxiosInstance = mockInstance as unknown as AxiosInstance
          return mockInstance
        }),
      },
    }
  })

  return import('../api').then((mod) => mod.default)
}

describe('ApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('request interceptor – auth token', () => {
    it('adds Authorization Bearer header when token exists in localStorage', async () => {
      localStorage.setItem('tsm_auth_token', 'my-jwt-token')
      await getApiClient()

      const config = {
        headers: {} as Record<string, string>,
      } as InternalAxiosRequestConfig

      const result = capturedReqFulfilled(config)
      expect(result.headers.Authorization).toBe('Bearer my-jwt-token')
    })

    it('does not add Authorization header when no token is stored', async () => {
      await getApiClient()

      const config = {
        headers: {} as Record<string, string>,
      } as InternalAxiosRequestConfig

      const result = capturedReqFulfilled(config)
      expect(result.headers.Authorization).toBeUndefined()
    })
  })

  describe('response interceptor – 401 handling', () => {
    it('clears token from localStorage on 401 response', async () => {
      localStorage.setItem('tsm_auth_token', 'expired-token')
      await getApiClient()

      const error = {
        response: { status: 401 },
        isAxiosError: true,
      } as AxiosError

      await expect(capturedResRejected(error)).rejects.toBe(error)
      expect(localStorage.getItem('tsm_auth_token')).toBeNull()
    })

    it('does not clear token on non-401 errors', async () => {
      localStorage.setItem('tsm_auth_token', 'valid-token')
      await getApiClient()

      const error = {
        response: { status: 500 },
        isAxiosError: true,
      } as AxiosError

      await expect(capturedResRejected(error)).rejects.toBe(error)
      expect(localStorage.getItem('tsm_auth_token')).toBe('valid-token')
    })
  })

  describe('listRoleTemplates – response envelope', () => {
    it('unwraps the { role_templates } envelope into a bare array', async () => {
      const api = await getApiClient()
      const templates = [
        { id: 'r-1', name: 'admin', display_name: 'Administrator', scopes: ['admin'], is_system: true },
      ]
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({ data: { role_templates: templates } })

      const result = await api.listRoleTemplates()

      // Must be a spreadable array (the RolesPage does `[...templates].sort(...)`).
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(templates)
    })

    it('tolerates a bare-array response', async () => {
      const api = await getApiClient()
      const templates = [{ id: 'r-2', name: 'viewer', display_name: 'Viewer', scopes: [], is_system: true }]
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({ data: templates })

      const result = await api.listRoleTemplates()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(templates)
    })

    it('returns an empty array when the envelope is empty', async () => {
      const api = await getApiClient()
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({ data: {} })

      const result = await api.listRoleTemplates()

      expect(result).toEqual([])
    })
  })

  describe('getVersionDrift – response envelope', () => {
    it('unwraps the { data } envelope into a VersionDrift summary', async () => {
      const api = await getApiClient()
      const summary = {
        run_id: 'run-1',
        total: 2,
        satisfied: 1,
        drift: 1,
        unknown: 0,
        entries: [
          { workspace_name: 'prod', required: '~> 1.5', actual: '1.6.2', satisfies: true, status: 'satisfied' },
          { workspace_name: 'stg', required: '>= 1.7', actual: '1.6.0', satisfies: false, status: 'drift' },
        ],
      }
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({ data: { data: summary } })

      const result = await api.getVersionDrift()

      expect(result).toEqual(summary)
      expect(Array.isArray(result.entries)).toBe(true)
    })

    it('normalises the empty/no-run case into a fully-shaped object', async () => {
      const api = await getApiClient()
      // Backend's no-completed-run shape: data carries only an empty entries array.
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({
        data: { data: { entries: [] }, message: 'no completed analysis runs found' },
      })

      const result = await api.getVersionDrift()

      expect(result).toEqual({
        run_id: '',
        total: 0,
        satisfied: 0,
        drift: 0,
        unknown: 0,
        entries: [],
      })
    })

    it('tolerates a missing data envelope', async () => {
      const api = await getApiClient()
      vi.mocked(_mockAxiosInstance.get).mockResolvedValue({ data: {} })

      const result = await api.getVersionDrift()

      expect(result.entries).toEqual([])
      expect(result.total).toBe(0)
    })
  })
})
