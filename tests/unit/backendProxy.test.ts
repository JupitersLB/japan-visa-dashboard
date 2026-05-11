import { afterEach, describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

const originalEnv = process.env

const importBackendProxy = async () => {
  vi.resetModules()
  return import('@/utils/backendProxy')
}

afterEach(() => {
  process.env = originalEnv
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.mocked(execFileSync).mockReset()
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

  it('uses a provided backend identity token without calling metadata', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_AUTH_MODE: 'google',
      BACKEND_ID_TOKEN: 'local-identity-token',
    }
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/meta/latest')).resolves.toEqual({
      ok: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://backend.example/meta/latest'
    )
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'Bearer local-identity-token'
    )
  })

  it('uses a gcloud identity token source during HAR recording', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_AUTH_MODE: 'google',
      BACKEND_TOKEN_SOURCE: 'gcloud',
      PLAYWRIGHT_HAR_MODE: 'record',
    }
    vi.mocked(execFileSync).mockReturnValue('gcloud-identity-token\n')
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        ok: true,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/meta/latest')).resolves.toEqual({
      ok: true,
    })

    expect(execFileSync).toHaveBeenCalledWith(
      'gcloud',
      ['auth', 'print-identity-token'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(
      'Bearer gcloud-identity-token'
    )
  })

  it('passes an explicit gcloud token audience when configured', async () => {
    process.env = {
      ...originalEnv,
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_AUTH_MODE: 'google',
      BACKEND_TOKEN_SOURCE: 'gcloud',
      BACKEND_GCLOUD_ID_TOKEN_AUDIENCE: 'https://audience.example',
      PLAYWRIGHT_HAR_MODE: 'record',
    }
    vi.mocked(execFileSync).mockReturnValue('gcloud-identity-token\n')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ok: true,
        })
      )
    )

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/meta/latest')).resolves.toEqual({
      ok: true,
    })

    expect(execFileSync).toHaveBeenCalledWith(
      'gcloud',
      [
        'auth',
        'print-identity-token',
        '--audiences=https://audience.example',
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }
    )
  })

  it('rejects gcloud token source outside test and HAR recording modes', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      BACKEND_BASE_URL: 'https://backend.example',
      BACKEND_AUTH_MODE: 'google',
      BACKEND_TOKEN_SOURCE: 'gcloud',
    }

    const { fetchBackendJson } = await importBackendProxy()

    await expect(fetchBackendJson('/meta/latest')).rejects.toMatchObject({
      status: 500,
      body: {
        detail: {
          code: 'backend_token_source_not_allowed',
        },
      },
    })
    expect(execFileSync).not.toHaveBeenCalled()
  })
})
