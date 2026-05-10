import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalEnv = process.env

const makeRequest = (url: string) => new NextRequest(url)

afterEach(() => {
  process.env = originalEnv
  vi.resetModules()
})

describe('frontend proxy route handlers', () => {
  it('rejects unknown metadata query parameters before proxying', async () => {
    process.env = {
      ...originalEnv,
      FRONTEND_PROXY_RATE_LIMIT: '0',
    }

    const { GET } = await import('@/app/api/meta/latest/route')
    const response = await GET(
      makeRequest('http://localhost/api/meta/latest?unexpected=true')
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      detail: {
        code: 'unknown_query_parameters',
        parameters: ['unexpected'],
      },
    })
  })

  it('rejects unknown prediction query parameters before proxying', async () => {
    process.env = {
      ...originalEnv,
      FRONTEND_PROXY_RATE_LIMIT: '0',
    }

    const { GET } = await import('@/app/api/predictions/route')
    const response = await GET(
      makeRequest(
        'http://localhost/api/predictions?location=Tokyo&unexpected=true'
      )
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      detail: {
        code: 'unknown_query_parameters',
        parameters: ['unexpected'],
      },
    })
  })
})
