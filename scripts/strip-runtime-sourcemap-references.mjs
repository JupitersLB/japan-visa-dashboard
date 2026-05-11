import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceMapReferencePattern =
  /(?:\r?\n)?\/\/# sourceMappingURL=[^\r\n]*\.map(?:\r?\n)?$/u

export const stripSourceMapReference = (contents) =>
  contents.replace(sourceMapReferencePattern, (match) =>
    match.endsWith('\n') ? '\n' : ''
  )

const walkJavaScriptFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walkJavaScriptFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath)
    }
  }

  return files
}

export const stripSourceMapReferences = async (directory) => {
  const files = await walkJavaScriptFiles(directory)
  let changed = 0

  for (const file of files) {
    const contents = await readFile(file, 'utf8')
    const stripped = stripSourceMapReference(contents)

    if (stripped !== contents) {
      await writeFile(file, stripped)
      changed += 1
    }
  }

  return { checked: files.length, changed }
}

const isCli = process.argv[1]
  ? fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
  : false

if (isCli) {
  const directory = process.argv[2]
  if (!directory) {
    console.error(
      'Usage: node scripts/strip-runtime-sourcemap-references.mjs <directory>'
    )
    process.exit(2)
  }

  const result = await stripSourceMapReferences(directory)
  console.log(
    `Stripped source map references from ${result.changed} of ${result.checked} JavaScript file(s)`
  )
}
