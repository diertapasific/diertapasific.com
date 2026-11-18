import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'dipa-api-runtime-'))
try {
  const result = spawnSync(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.api.json', '--noEmit', 'false', '--allowImportingTsExtensions', 'false', '--outDir', directory, '--rootDir', '.'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('API compilation failed')
  await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }))
  for (const name of ['cloudStore', 'spotifyCore', 'tifa', 'tifaContext', 'vercelBackend']) {
    await copyFile(join(root, `server/${name}.mjs`), join(directory, `server/${name}.mjs`))
  }
  for (const route of ['api/tifa.js', 'api/spotify/now-playing.js']) {
    const module = await import(pathToFileURL(join(directory, route)).href)
    assert.equal(typeof module.default?.fetch, 'function', `${route} must export a Web Standard handler`)
  }
  console.log('Both compiled Node API modules load successfully.')
} finally {
  await rm(directory, { recursive: true, force: true })
}
