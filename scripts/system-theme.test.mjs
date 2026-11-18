import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const code = ts.transpileModule(await readFile(new URL('../src/desk/systemTheme.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { followSystemTheme } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

test('theme follows initial and later system preferences and releases its listener', () => {
  for (const initial of [false, true]) {
    const listeners = new Set(), changes = []
    const media = { matches: initial, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) }
    const stop = followSystemTheme(media, dark => changes.push(dark))
    assert.deepEqual(changes, [initial])
    media.matches = !initial; listeners.forEach(fn => fn())
    assert.deepEqual(changes, [initial, !initial])
    stop(); assert.equal(listeners.size, 0)
  }
})
