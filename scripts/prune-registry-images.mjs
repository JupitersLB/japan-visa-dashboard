#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const readVersionTag = () => {
  if (!existsSync('VERSION')) {
    throw new Error('VERSION does not exist')
  }

  const version = readFileSync('VERSION', 'utf8').trim().replaceAll('"', '')
  if (!/^v?\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`VERSION must look like v1.2.3 or 1.2.3, got ${version}`)
  }

  return version.startsWith('v') ? version : `v${version}`
}

const getArg = (name) => {
  const prefix = `--${name}=`
  const arg = process.argv.find((value) => value.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : null
}

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'inherit'],
  }).trim()

const imageRepository =
  getArg('image-repository') ||
  process.env.IMAGE_REPOSITORY ||
  `gcr.io/${process.env.PROJECT_ID || 'japan-visa-predictions'}/${
    process.env.SERVICE_NAME || 'jp-visa-front'
  }`
const dryRun = process.env.DRY_RUN !== 'false'
const versionTag = readVersionTag()

const images = JSON.parse(
  run('gcloud', [
    'container',
    'images',
    'list-tags',
    imageRepository,
    '--format=json',
    '--sort-by=~timestamp',
    '--limit=999999',
  ])
)
  .filter((image) => image.digest)
  .map((image) => ({
    digest: image.digest,
    tags: Array.isArray(image.tags) ? image.tags : [],
  }))

if (images.length === 0) {
  process.stdout.write(`No registry images found for ${imageRepository}\n`)
  process.exit(0)
}

const currentIndex = images.findIndex((image) => image.tags.includes(versionTag))
if (currentIndex === -1) {
  throw new Error(
    `Refusing to prune ${imageRepository}: VERSION tag ${versionTag} was not found in the registry`
  )
}

const protectedDigests = new Set([images[currentIndex].digest])
for (const image of images.slice(0, 2)) {
  protectedDigests.add(image.digest)
}

const deletableImages = images.filter(
  (image) => !protectedDigests.has(image.digest)
)

process.stdout.write(`Registry: ${imageRepository}\n`)
process.stdout.write(`Protected VERSION tag: ${versionTag}\n`)
process.stdout.write(
  `Protected digests:\n${[...protectedDigests]
    .map((digest) => {
      const image = images.find((candidate) => candidate.digest === digest)
      const tags = image?.tags.length ? image.tags.join(',') : '<untagged>'
      return `- ${digest} ${tags}`
    })
    .join('\n')}\n`
)

if (deletableImages.length === 0) {
  process.stdout.write('No registry images to delete.\n')
  process.exit(0)
}

process.stdout.write(
  `${dryRun ? 'Would delete' : 'Deleting'} ${deletableImages.length} registry image(s):\n`
)

for (const image of deletableImages) {
  const ref = `${imageRepository}@${image.digest}`
  const tags = image.tags.length ? image.tags.join(',') : '<untagged>'
  process.stdout.write(`- ${ref} ${tags}\n`)

  if (!dryRun) {
    run(
      'gcloud',
      ['container', 'images', 'delete', ref, '--force-delete-tags', '--quiet'],
      { stdio: 'inherit' }
    )
  }
}

if (dryRun) {
  process.stdout.write('Set DRY_RUN=false to delete these images.\n')
}
