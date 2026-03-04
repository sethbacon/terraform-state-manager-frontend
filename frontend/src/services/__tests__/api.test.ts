import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// We need to test the interceptors in the ApiClient class.
// Since api.ts exports a singleton, we import it to get the interceptors.
import api from '../api';

describe('api service', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter((api as any).client || axios);
    localStorage.clear();
  });

  afterEach(() => {
    mock?.restore();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Bearer token to requests when token is in localStorage', async () => {
    localStorage.setItem('tsm_auth_token', 'test-jwt-token');

    let capturedHeaders: Record<string, string> = {};
    mock.onGet('/api/v1/test').reply((config) => {
      capturedHeaders = (config.headers as Record<string, string>) || {};
      return [200, { data: 'ok' }];
    });

    await api.get('/api/v1/test');
    expect(capturedHeaders['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('does not attach Authorization header when no token in localStorage', async () => {
    let capturedHeaders: Record<string, string> = {};
    mock.onGet('/api/v1/test').reply((config) => {
      capturedHeaders = (config.headers as Record<string, string>) || {};
      return [200, { data: 'ok' }];
    });

    await api.get('/api/v1/test');
    expect(capturedHeaders['Authorization']).toBeUndefined();
  });

  it('clears token from localStorage on 401 response', async () => {
    localStorage.setItem('tsm_auth_token', 'expired-token');
    mock.onGet('/api/v1/protected').reply(401, { error: 'Unauthorized' });

    // Suppress expected rejection
    await api.get('/api/v1/protected').catch(() => {});

    expect(localStorage.getItem('tsm_auth_token')).toBeNull();
  });

  it('does not clear token on non-401 errors', async () => {
    localStorage.setItem('tsm_auth_token', 'valid-token');
    mock.onGet('/api/v1/data').reply(500, { error: 'Server Error' });

    await api.get('/api/v1/data').catch(() => {});

    expect(localStorage.getItem('tsm_auth_token')).toBe('valid-token');
  });
});
