import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = process.env

const makeRequest = (headers: Record<string, string> = {}) =>
  new NextRequest('http://localhost/api/predictions', { headers })

const importRateLimiter = async () => {
  vi.resetModules()
  return import('@/utils/proxyRateLimit')
}

afterEach(() => {
  process.env = originalEnv
  vi.useRealTimers()
})

describe('rateLimitProxyRequest', () => {
  it('allows requests until the configured limit is exceeded', async () => {
    process.env = {
      ...originalEnv,
      FRONTEND_PROXY_RATE_LIMIT: '2',
      FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS: '60',
    }
    vi.setSystemTime(new Date('2026-05-11T00:00:00Z'))

    const { rateLimitProxyRequest } = await importRateLimiter()
    const request = makeRequest({ 'x-real-ip': '203.0.113.10' })

    expect(rateLimitProxyRequest(request, 'predictions')).toBeNull()
    expect(rateLimitProxyRequest(request, 'predictions')).toBeNull()

    const response = rateLimitProxyRequest(request, 'predictions')
    expect(response?.status).toBe(429)
    expect(response?.headers.get('Retry-After')).toBe('60')
    await expect(response?.json()).resolves.toEqual({
      detail: {
        code: 'rate_limit_exceeded',
      },
    })
  })

  it('uses the Google-appended client address from X-Forwarded-For', async () => {
    process.env = {
      ...originalEnv,
      FRONTEND_PROXY_RATE_LIMIT: '1',
      FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS: '60',
    }
    vi.setSystemTime(new Date('2026-05-11T00:00:00Z'))

    const { rateLimitProxyRequest } = await importRateLimiter()
    const requestFromTrustedClient = makeRequest({
      'x-forwarded-for': '198.51.100.50, 203.0.113.20',
    })
    const requestWithSpoofedLeftmostValue = makeRequest({
      'x-forwarded-for': '192.0.2.99, 198.51.100.50, 203.0.113.20',
    })

    expect(
      rateLimitProxyRequest(requestFromTrustedClient, 'predictions')
    ).toBeNull()
    expect(
      rateLimitProxyRequest(requestWithSpoofedLeftmostValue, 'predictions')
        ?.status
    ).toBe(429)
  })
})
