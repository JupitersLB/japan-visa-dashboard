#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const command = process.argv[2]
const releaseType = process.argv[3]
const validReleaseTypes = new Set(['patch', 'minor', 'major'])

const readVersion = () => {
  if (!existsSync('VERSION')) {
    throw new Error('VERSION does not exist')
  }

  const rawVersion = readFileSync('VERSION', 'utf8').trim().replaceAll('"', '')
  const match = rawVersion.match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`VERSION must look like v1.2.3 or 1.2.3, got ${rawVersion}`)
  }

  return {
    tag: rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

const writeVersion = ({ major, minor, patch }) => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  const npmVersion = `${major}.${minor}.${patch}`
  const tagVersion = `v${npmVersion}`

  packageJson.version = npmVersion

  writeFileSync('VERSION', `${tagVersion}\n`)
  writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`)
}

const bumpVersion = () => {
  if (!validReleaseTypes.has(releaseType)) {
    throw new Error(
      `Usage: node scripts/release-version.mjs bump <${[
        ...validReleaseTypes,
      ].join('|')}>`
    )
  }

  const version = readVersion()

  if (releaseType === 'major') {
    version.major += 1
    version.minor = 0
    version.patch = 0
  }

  if (releaseType === 'minor') {
    version.minor += 1
    version.patch = 0
  }

  if (releaseType === 'patch') {
    version.patch += 1
  }

  writeVersion(version)
  process.stdout.write(`${readVersion().tag}\n`)
}

const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()

const getPreviousTag = (version) => {
  try {
    return git(['describe', '--tags', '--abbrev=0', `${version.tag}^`])
  } catch {
    try {
      return git(['describe', '--tags', '--abbrev=0'])
    } catch {
      return null
    }
  }
}

const getCommitSubjects = (previousTag) => {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD'

  try {
    return git(['log', '--format=%s', range])
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('Changelog updated for '))
  } catch {
    return []
  }
}

const updateChangelog = () => {
  const version = readVersion()
  const date = new Date().toISOString().slice(0, 10)
  const previousTag = getPreviousTag(version)
  const subjects = getCommitSubjects(previousTag)
  const entries =
    subjects.length > 0
      ? subjects.map((subject) => `- ${subject}`).join('\n')
      : '- Release version bump.'
  const section = `## ${version.tag} - ${date}\n\n${entries}\n`
  const existingChangelog = existsSync('CHANGELOG.md')
    ? readFileSync('CHANGELOG.md', 'utf8').trim()
    : '# Changelog'

  const changelogWithoutDuplicate = existingChangelog
    .replace(
      new RegExp(
        `\\n?## ${version.tag.replaceAll('.', '\\.')} - \\d{4}-\\d{2}-\\d{2}\\n\\n[\\s\\S]*?(?=\\n## |$)`
      ),
      ''
    )
    .trim()

  const nextChangelog = changelogWithoutDuplicate.replace(
    /^# Changelog\s*/,
    `# Changelog\n\n${section}\n`
  )

  writeFileSync('CHANGELOG.md', `${nextChangelog.trim()}\n`)
  process.stdout.write(`${version.tag}\n`)
}

if (command === 'bump') {
  bumpVersion()
} else if (command === 'changelog') {
  updateChangelog()
} else {
  throw new Error('Usage: node scripts/release-version.mjs <bump|changelog>')
}
