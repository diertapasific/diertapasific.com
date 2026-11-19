import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/analytics.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { publicPageView } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)

test('analytics strips URL query and hash data without mutating the source event', () => {
  const event = { type: 'pageview', url: 'https://www.diertapasific.com/?question=private-message&email=visitor%40example.com#tifa', text: 'private-message' }
  assert.deepEqual(publicPageView(event), { type: 'pageview', url: 'https://www.diertapasific.com/' })
  assert.ok(event.url.includes('private-message'))
  assert.deepEqual(publicPageView({ type: 'pageview', url: 'https://www.diertapasific.com/projects?token=private-value#detail' }), { type: 'pageview', url: 'https://www.diertapasific.com/projects' })
})
test('analytics rejects custom events rather than forwarding chat or contact properties', () => {
  assert.equal(publicPageView({ type: 'event', url: 'https://www.diertapasific.com/', name: 'chat', properties: { message: 'private-message' } }), null)
})
test('analytics ignores malformed or non-web URLs safely', () => {
  for (const url of ['invalid URL', 'javascript:alert(1)', 'data:text/plain,private-value', 'mailto:visitor@example.com']) {
    assert.equal(publicPageView({ type: 'pageview', url }), null)
  }
})
