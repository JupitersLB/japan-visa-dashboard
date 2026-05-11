import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  stripSourceMapReference,
  stripSourceMapReferences,
} from '../../scripts/strip-runtime-sourcemap-references.mjs'

describe('strip runtime source map references', () => {
  it('removes a trailing JavaScript source map reference', () => {
    expect(
      stripSourceMapReference(
        'console.log("built");\n//# sourceMappingURL=chunk.js.map\n'
      )
    ).toBe('console.log("built");\n')
  })

  it('leaves non-trailing source map text untouched', () => {
    expect(
      stripSourceMapReference(
        'console.log("sourceMappingURL=chunk.js.map");\nconsole.log("done");\n'
      )
    ).toBe(
      'console.log("sourceMappingURL=chunk.js.map");\nconsole.log("done");\n'
    )
  })

  it('strips JavaScript files in a directory tree', async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'runtime-sourcemaps-')
    )
    const file = path.join(directory, 'chunk.js')

    await writeFile(
      file,
      'window.__chunk = true;\n//# sourceMappingURL=chunk.js.map'
    )

    await expect(stripSourceMapReferences(directory)).resolves.toEqual({
      checked: 1,
      changed: 1,
    })
    await expect(readFile(file, 'utf8')).resolves.toBe('window.__chunk = true;')
  })
})
