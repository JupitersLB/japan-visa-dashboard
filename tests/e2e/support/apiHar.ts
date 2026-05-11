import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { type Page } from '@playwright/test'

const apiHarPattern = /\/api\/(?:meta\/latest|predictions)(?:\?|$)/

type HarMode = 'record' | 'update' | undefined

const harPath = (name: string) =>
  join(process.cwd(), 'tests/e2e/hars', `${name}.har`)

const validateHarMode = (name: string, path: string, mode: HarMode) => {
  if (
    process.env.PLAYWRIGHT_HAR_NAME &&
    process.env.PLAYWRIGHT_HAR_NAME !== name
  ) {
    throw new Error(
      `HAR test "${name}" cannot run while PLAYWRIGHT_HAR_NAME=${process.env.PLAYWRIGHT_HAR_NAME}`
    )
  }

  if (mode === 'record' && existsSync(path)) {
    throw new Error(`${path} already exists. Use e2e-har-update to refresh it.`)
  }

  if (mode === 'update' && !existsSync(path)) {
    throw new Error(`${path} does not exist. Use e2e-har-record to create it.`)
  }

  if (!mode && !existsSync(path)) {
    throw new Error(`${path} does not exist. Run make e2e-har-record first.`)
  }
}

export const useApiHar = async (page: Page, name: string) => {
  const mode = process.env.PLAYWRIGHT_HAR_MODE as HarMode
  const path = harPath(name)

  validateHarMode(name, path, mode)

  await page.routeFromHAR(path, {
    notFound: mode ? 'fallback' : 'abort',
    update: Boolean(mode),
    updateContent: 'embed',
    updateMode: 'minimal',
    url: apiHarPattern,
  })
}
