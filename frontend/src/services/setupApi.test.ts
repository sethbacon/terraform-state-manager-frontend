import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupApi } from './setupApi'
import { apiClient } from './api'

vi.mock('./api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

const mocked = vi.mocked(apiClient)
const tokenHdr = { headers: { Authorization: 'SetupToken tok' } }

beforeEach(() => {
  vi.clearAllMocks()
  mocked.post.mockResolvedValue({ data: {} } as never)
  mocked.get.mockResolvedValue({ data: {} } as never)
})

describe('setupApi', () => {
  it('getStatus GETs the public status endpoint (no token)', async () => {
    mocked.get.mockResolvedValue({ data: { setup_completed: false } } as never)
    await setupApi.getStatus()
    expect(mocked.get).toHaveBeenCalledWith('/api/v1/setup/status')
  })

  it('validateToken sends the SetupToken Authorization header', async () => {
    mocked.post.mockResolvedValue({ data: { valid: true } } as never)
    const r = await setupApi.validateToken('tok')
    expect(r.valid).toBe(true)
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/validate-token', {}, tokenHdr)
  })

  it('configureOwner posts the email under the token header', async () => {
    await setupApi.configureOwner('tok', 'a@b.com')
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/admin', { email: 'a@b.com' }, tokenHdr)
  })

  it('OIDC + source + complete calls hit their endpoints with the token', async () => {
    const oidc = { issuer_url: 'i', client_id: 'c', client_secret: 's' }
    await setupApi.testOIDC('tok', oidc)
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/oidc/test', oidc, tokenHdr)
    await setupApi.saveOIDC('tok', oidc)
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/oidc', oidc, tokenHdr)

    mocked.post.mockResolvedValue({ data: { states: 2 } } as never)
    const src = { name: 'n', type: 'local' }
    expect((await setupApi.testSource('tok', src)).states).toBe(2)
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/sources/test', src, tokenHdr)
    await setupApi.saveSource('tok', src)
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/sources', src, tokenHdr)

    await setupApi.complete('tok')
    expect(mocked.post).toHaveBeenCalledWith('/api/v1/setup/complete', {}, tokenHdr)
  })
})
