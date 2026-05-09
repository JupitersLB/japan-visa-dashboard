import { NextRequest, NextResponse } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

const getNumericSetting = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getLimit = () =>
  getNumericSetting(process.env.FRONTEND_PROXY_RATE_LIMIT, 60)
const getWindowMs = () =>
  getNumericSetting(process.env.FRONTEND_PROXY_RATE_LIMIT_WINDOW_SECONDS, 60) *
  1000

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'

  return request.headers.get('x-real-ip') || 'unknown'
}

export const rateLimitProxyRequest = (
  request: NextRequest,
  scope: string
): NextResponse | null => {
  const limit = getLimit()
  if (limit <= 0) return null

  const now = Date.now()
  const windowMs = getWindowMs()
  const key = `${scope}:${getClientIdentifier(request)}`
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    })
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
