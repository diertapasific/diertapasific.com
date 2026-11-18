import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const code = ts.transpileModule(await readFile(new URL('../src/desk/replyReveal.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { revealReply, followsReply } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
function timeline(text) {
  let now = 0, next = 0, completed = 0
  const frames = new Map(), writes = []
  const controller = revealReply(text, value => writes.push(value), () => completed++, {
    now: () => now, frame: draw => { frames.set(++next, draw); return next }, cancel: id => frames.delete(id),
  })
  return { controller, writes, get completed() { return completed }, get pending() { return frames.size }, advance(time) { now = time; const batch = [...frames.values()]; frames.clear(); batch.forEach(draw => draw(now)) } }
}

test('reply reveal advances with elapsed time and finishes after a long background frame', () => {
  const text = 'Dipa builds agentic platforms. '.repeat(40), run = timeline(text)
  run.advance(100)
  assert.ok(run.writes.at(-1).length > 0 && run.writes.at(-1).length < text.length)
  run.advance(4000)
  assert.ok(run.writes.at(-1).length > text.length / 2)
  run.advance(20000)
  assert.equal(run.writes.at(-1), text)
  assert.equal(run.completed, 1)
  assert.equal(run.pending, 0)
})
test('reset/unmount cancels future text writes and completion callbacks', () => {
  const run = timeline('A reply that is still arriving.')
  run.advance(100)
  const before = [...run.writes]
  run.controller.cancel(); run.advance(9000); run.controller.finish()
  assert.deepEqual(run.writes, before)
  assert.equal(run.completed, 0)
  assert.equal(run.pending, 0)
})
test('show-full / hidden-tab completion is immediate and idempotent', () => {
  const run = timeline('A complete reply with its source links.')
  run.controller.finish(); run.controller.finish(); run.advance(9000)
  assert.equal(run.writes.at(-1), 'A complete reply with its source links.')
  assert.equal(run.completed, 1)
  assert.equal(run.pending, 0)
  assert.equal(timeline('').completed, 1)
})
test('progressive text never splits a Unicode surrogate pair', () => {
  const run = timeline('Dipa studies 𠮷 and writes about projects.')
  for (let time = 0; time < 600; time += 10) run.advance(time)
  for (const write of run.writes) assert.equal(write.isWellFormed(), true)
})
test('new text follows the reply only while the reader remains near the bottom', () => {
  assert.equal(followsReply(400, 300, 730), true)
  assert.equal(followsReply(200, 300, 730), false)
  assert.equal(followsReply(0, 400, 200), true)
})
