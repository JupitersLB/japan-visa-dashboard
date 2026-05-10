import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = process.env

const importBackendProxy = async () => {
  vi.resetModules()
  return import('@/utils/backendProxy')
}

afterEach(() => {
  process.env = originalEnv
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchBackendJson', () => {
  it('maps backend timeout aborts to a safe 504 response body', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_PROXY_TIMEOUT_MS: '5',
    }
    vi.useFakeTimers()

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: URL | RequestInfo, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
    )

    const { fetchBackendJson, BackendProxyError } = await importBackendProxy()
    const promise = fetchBackendJson('/predictions').catch((error) => error)

    await vi.advanceTimersByTimeAsync(5)
    const error = await promise
    expect(error).toMatchObject({
      status: 504,
      body: {
        detail: {
          code: 'backend_proxy_timeout',
        },
      },
    })
    expect(error).toBeInstanceOf(BackendProxyError)
  })

  it('does not leak non-json backend response bodies', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('upstream stack trace', {
          status: 502,
          headers: {
            'content-type': 'text/plain',
          },
        })
      )
    )

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/predictions')).rejects.toMatchObject({
      status: 502,
      body: {
        detail: {
          code: 'backend_non_json_response',
        },
      },
    })
  })

  it('attaches a Google identity token when configured for private backend auth', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_AUTH_MODE: 'google',
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('identity-token', {
          status: 200,
          headers: {
            'content-type': 'text/plain',
          },
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
        })
      )
    vi.stubGlobal('fetch', fetchMock)

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/meta/latest')).resolves.toEqual({
      ok: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const metadataCall = fetchMock.mock.calls[0]
    expect(String(metadataCall[0])).toContain('metadata.google.internal')
    expect(metadataCall[1]?.headers).toEqual({
      'Metadata-Flavor': 'Google',
    })

    const backendCall = fetchMock.mock.calls[1]
    expect(String(backendCall[0])).toBe('https://backend.example/meta/latest')
    expect(new Headers(backendCall[1]?.headers).get('Authorization')).toBe(
      'Bearer identity-token'
    )
  })
})
