import { NextRequest, NextResponse } from 'next/server'
import { isIP } from 'net'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()
let nextCleanupAt = 0

const getNumericSetting = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getLimit = () =>
  getNumericSetting(process.env.FRONTEND_PROXY_RATE_LIMIT, 60)
const getWindowMs = () =>
  getNumericSetting(process.env.FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS, 60) *
  1000
const getMaxBuckets = () =>
  getNumericSetting(process.env.FRONTEND_PROXY_RATE_LIMIT_MAX_BUCKETS, 10000)

const normalizeIpHeaderValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const withoutBrackets = trimmed.startsWith('[')
    ? trimmed.slice(1, trimmed.indexOf(']'))
    : trimmed
  const withoutPort = withoutBrackets.includes(':')
    ? withoutBrackets
    : withoutBrackets.split(':')[0]

  return isIP(withoutPort) ? withoutPort.toLowerCase() : null
}

const getFirstForwardedIp = (value: string | null) => {
  if (!value) return null

  for (const forwardedValue of value.split(',')) {
    const normalized = normalizeIpHeaderValue(forwardedValue)
    if (normalized) return normalized
  }

  return null
}

const cleanupExpiredBuckets = (now: number, windowMs: number) => {
  if (now < nextCleanupAt) return

  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }

  nextCleanupAt = now + Math.max(windowMs, 1000)
}

const pruneOldestBuckets = (maxBuckets: number) => {
  if (maxBuckets <= 0) return

  while (buckets.size > maxBuckets) {
    const oldestKey = buckets.keys().next().value as string | undefined
    if (!oldestKey) return
    buckets.delete(oldestKey)
  }
}

const getClientIdentifier = (request: NextRequest) => {
  return (
    getFirstForwardedIp(request.headers.get('x-forwarded-for')) ||
    normalizeIpHeaderValue(request.headers.get('x-real-ip') || '') ||
    'unknown'
  )
}

export const rateLimitProxyRequest = (
  request: NextRequest,
  scope: string
): NextResponse | null => {
  const limit = getLimit()
  if (limit <= 0) return null

  const now = Date.now()
  const windowMs = getWindowMs()
  cleanupExpiredBuckets(now, windowMs)

  const key = `${scope}:${getClientIdentifier(request)}`
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
    pruneOldestBuckets(getMaxBuckets())
    return null
  }

  current.count += 1

  if (current.count <= limit) {
    return null
  }

  const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)

  return NextResponse.json(
    {
      detail: {
        code: 'rate_limit_exceeded',
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
