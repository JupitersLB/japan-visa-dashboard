import { NextRequest, NextResponse } from 'next/server'
import { fetchBackendJson, BackendProxyError } from '@/utils/backendProxy'
import { BackendPredictionResponse } from '@/utils/backendApi'
import { rateLimitProxyRequest } from '@/utils/proxyRateLimit'

export const runtime = 'nodejs'
const oneWeekInSeconds = 7 * 24 * 60 * 60
const cacheTtlMs =
  Number(process.env.PREDICTIONS_PROXY_CACHE_SECONDS || oneWeekInSeconds) * 1000

const allowedQueryParameters = new Set([
  'location',
  'application_type',
  'submitted_from',
  'stats_from',
  'stats_to',
])

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimitProxyRequest(request, 'predictions')
  if (rateLimitResponse) return rateLimitResponse

  const unknownParameters = Array.from(
    request.nextUrl.searchParams.keys()
  ).filter((parameter) => !allowedQueryParameters.has(parameter))

  if (unknownParameters.length > 0) {
    return NextResponse.json(
      {
        detail: {
          code: 'unknown_query_parameters',
          parameters: unknownParameters,
        },
      },
      { status: 400 }
    )
  }

  const queryString = request.nextUrl.searchParams.toString()
  const backendPath = queryString
    ? `/predictions?${queryString}`
    : '/predictions'

  try {
    const data = await fetchBackendJson<BackendPredictionResponse>(
      backendPath,
      {},
      {
        cacheTtlMs,
      }
    )
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof BackendProxyError) {
      return NextResponse.json(error.body, { status: error.status })
    }

    return NextResponse.json(
      {
        detail: {
          code: 'backend_proxy_error',
        },
      },
      { status: 502 }
    )
  }
}
