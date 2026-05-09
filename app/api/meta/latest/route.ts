import { NextRequest, NextResponse } from 'next/server'
import { fetchBackendJson, BackendProxyError } from '@/utils/backendProxy'
import { LatestMetadataResponse } from '@/utils/backendApi'
import { rateLimitProxyRequest } from '@/utils/proxyRateLimit'

export const runtime = 'nodejs'
const oneWeekInSeconds = 7 * 24 * 60 * 60
const cacheTtlMs =
  Number(process.env.META_LATEST_PROXY_CACHE_SECONDS || oneWeekInSeconds) * 1000

export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimitProxyRequest(request, 'meta-latest')
  if (rateLimitResponse) return rateLimitResponse

  const unknownParameters = Array.from(request.nextUrl.searchParams.keys())
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

  try {
    const data = await fetchBackendJson<LatestMetadataResponse>(
      '/meta/latest',
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
