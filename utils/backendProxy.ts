const defaultBackendBaseUrl = 'http://127.0.0.1:8000'
const metadataIdentityUrl =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity'
const tokenCacheTtlMs = 45 * 60 * 1000
const defaultIdentityTokenTimeoutMs = 2000
const defaultBackendProxyTimeoutMs = 10000

type JsonBody = Record<string, unknown> | unknown[]

type CachedIdentityToken = {
  token: string
  expiresAt: number
}

type CachedResponse = {
  body: JsonBody
  expiresAt: number
}

type BackendFetchOptions = {
  cacheTtlMs?: number
  cacheKey?: string
}

let cachedIdentityToken: CachedIdentityToken | null = null
const responseCache = new Map<string, CachedResponse>()

export class BackendProxyError extends Error {
  status: number
  body: JsonBody

  constructor(status: number, body: JsonBody) {
    super(`Backend API returned ${status}`)
    this.status = status
    this.body = body
  }
}

const isProductionRuntime = () =>
  process.env.ENVIRONMENT === 'production' || Boolean(process.env.K_SERVICE)

const getBackendBaseUrl = () => {
  const configuredBackendBaseUrl = process.env.BACKEND_BASE_URL

  if (configuredBackendBaseUrl) return configuredBackendBaseUrl

  if (isProductionRuntime()) {
    throw new BackendProxyError(500, {
      detail: {
        code: 'backend_base_url_missing',
      },
    })
  }

  return defaultBackendBaseUrl
}

const usesGoogleIdentity = () =>
  process.env.BACKEND_AUTH_MODE === 'google' ||
  Boolean(process.env.K_SERVICE && getBackendBaseUrl().startsWith('https://'))

const getBackendAudience = () =>
  process.env.BACKEND_ID_TOKEN_AUDIENCE || getBackendBaseUrl()

const getNumericSetting = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getPositiveNumericSetting = (
  value: string | undefined,
  fallback: number
) => {
  const parsed = getNumericSetting(value, fallback)
  return parsed > 0 ? parsed : fallback
}

const maxResponseCacheEntries = getNumericSetting(
  process.env.BACKEND_PROXY_CACHE_MAX_ENTRIES,
  500
)
const identityTokenTimeoutMs = getPositiveNumericSetting(
  process.env.BACKEND_IDENTITY_TOKEN_TIMEOUT_MS,
  defaultIdentityTokenTimeoutMs
)
const backendProxyTimeoutMs = getPositiveNumericSetting(
  process.env.BACKEND_PROXY_TIMEOUT_MS,
  defaultBackendProxyTimeoutMs
)

const timeoutBody = (code: string) => ({
  detail: {
    code,
  },
})

const fetchWithTimeout = async (
  input: URL | RequestInfo,
  init: RequestInit,
  timeoutMs: number,
  timeoutCode: string
) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new BackendProxyError(504, timeoutBody(timeoutCode))
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const getCachedResponse = (key: string) => {
  const cached = responseCache.get(key)
  if (!cached) return null

  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key)
    return null
  }

  return cached.body
}

const setCachedResponse = (key: string, body: JsonBody, ttlMs: number) => {
  if (ttlMs <= 0) return

  if (maxResponseCacheEntries <= 0) return

  if (responseCache.size >= maxResponseCacheEntries) {
    const oldestKey = responseCache.keys().next().value
    if (oldestKey) responseCache.delete(oldestKey)
  }

  responseCache.set(key, {
    body,
    expiresAt: Date.now() + ttlMs,
  })
}

const getIdentityToken = async () => {
  const now = Date.now()
  if (cachedIdentityToken && cachedIdentityToken.expiresAt > now) {
    return cachedIdentityToken.token
  }

  const url = new URL(metadataIdentityUrl)
  url.searchParams.set('audience', getBackendAudience())

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        'Metadata-Flavor': 'Google',
      },
      cache: 'no-store',
    },
    identityTokenTimeoutMs,
    'backend_identity_token_timeout'
  )

  if (!response.ok) {
    throw new BackendProxyError(502, {
      detail: {
        code: 'backend_identity_token_unavailable',
      },
    })
  }

  const token = await response.text()
  cachedIdentityToken = {
    token,
    expiresAt: now + tokenCacheTtlMs,
  }

  return token
}

const readJsonBody = async (response: Response): Promise<JsonBody> => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return {
      detail: {
        code: 'backend_non_json_response',
      },
    }
  }

  return (await response.json()) as JsonBody
}

export const fetchBackendJson = async <T>(
  path: string,
  init: RequestInit = {},
  options: BackendFetchOptions = {}
): Promise<T> => {
  const backendBaseUrl = getBackendBaseUrl()
  const url = new URL(path, backendBaseUrl)
  const headers = new Headers(init.headers)
  const method = init.method || 'GET'
  const cacheKey = options.cacheKey || `${method} ${backendBaseUrl}${path}`
  const shouldUseResponseCache = method === 'GET' && Boolean(options.cacheTtlMs)

  if (shouldUseResponseCache) {
    const cached = getCachedResponse(cacheKey)
    if (cached) return cached as T
  }

  if (usesGoogleIdentity()) {
    headers.set('Authorization', `Bearer ${await getIdentityToken()}`)
  }

  const response = await fetchWithTimeout(
    url,
    {
      ...init,
      headers,
      cache: 'no-store',
    },
    backendProxyTimeoutMs,
    'backend_proxy_timeout'
  )

  const body = await readJsonBody(response)

  if (!response.ok) {
    throw new BackendProxyError(response.status, body)
  }

  if (shouldUseResponseCache && options.cacheTtlMs) {
    setCachedResponse(cacheKey, body, options.cacheTtlMs)
  }

  return body as T
}
