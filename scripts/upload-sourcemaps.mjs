import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const args = process.argv.slice(2)

const readOption = (name, defaultValue) => {
  const index = args.indexOf(name)
  if (index === -1) return defaultValue

  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`)
  }
  return value
}

const hasFlag = (name) => args.includes(name)

const sourceRoot = path.resolve(
  readOption('--source-root', './local-sourcemaps/static')
)
const dryRun = hasFlag('--dry-run')

const requiredEnv = (name) => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

const rollbarToken = requiredEnv('ROLLBAR_SERVER_TOKEN')
const baseUrl = requiredEnv('NEXT_PUBLIC_BASE_URL')
const codeVersion =
  process.env.ROLLBAR_CODE_VERSION ||
  process.env.NEXT_PUBLIC_ROLLBAR_CODE_VERSION ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

const toPublicMinifiedUrl = (sourcemapPath) => {
  const relativePath = path
    .relative(sourceRoot, sourcemapPath)
    .split(path.sep)
    .join('/')
  const minifiedPath = relativePath.replace(/\.map$/, '')

  return new URL(`/_next/static/${minifiedPath}`, baseUrl).href
}

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)))
    } else {
      files.push(entryPath)
    }
  }

  return files
}

if (!existsSync(sourceRoot)) {
  throw new Error(`source map directory not found: ${sourceRoot}`)
}

const sourcemaps = (await walk(sourceRoot)).filter((filePath) =>
  filePath.endsWith('.js.map')
)

if (sourcemaps.length === 0) {
  throw new Error(`no JavaScript source maps found under ${sourceRoot}`)
}

console.log(
  `Uploading ${sourcemaps.length} JavaScript source map(s) to Rollbar for ${codeVersion}`
)

for (const sourcemap of sourcemaps) {
  const minifiedUrl = toPublicMinifiedUrl(sourcemap)
  console.log(`${path.relative(process.cwd(), sourcemap)} -> ${minifiedUrl}`)

  if (dryRun) {
    continue
  }

  const result = spawnSync(
    'curl',
    [
      '--fail',
      '--show-error',
      '--silent',
      '--request',
      'POST',
      '--url',
      'https://api.rollbar.com/api/1/sourcemap',
      '--form',
      `access_token=${rollbarToken}`,
      '--form',
      `version=${codeVersion}`,
      '--form',
      `minified_url=${minifiedUrl}`,
      '--form',
      `source_map=@${sourcemap}`,
    ],
    { encoding: 'utf8' }
  )

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    throw new Error(`Rollbar source map upload failed for ${sourcemap}`)
  }
}

const scriptPath = fileURLToPath(import.meta.url)
console.log(
  `Source map upload completed by ${path.relative(process.cwd(), scriptPath)}`
)
