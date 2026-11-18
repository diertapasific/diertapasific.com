import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/desk/outsideTap.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { listenForOutsideTap } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

function setup() {
  const canvas = new EventTarget(), scope = new EventTarget()
  let closes = 0, clicksThrough = 0
  const cleanup = listenForOutsideTap(canvas, scope, (x, y) => x >= 40 && x <= 100 && y >= 40 && y <= 100, () => closes++)
  canvas.addEventListener('click', () => clicksThrough++)
  const emit = (name, x = 15, y = 15, extra = {}) => {
    const event = new Event(name, { cancelable: true })
    Object.assign(event, { pointerId: 1, isPrimary: true, button: 0, detail: 1, clientX: x, clientY: y, ...extra })
    const target = ['pointerup', 'pointermove', 'pointercancel', 'blur'].includes(name) ? scope : canvas
    if (name === 'pointerup') Object.defineProperty(event, 'target', { value: canvas })
    target.dispatchEvent(event)
    return event
  }
  const tap = (x, y, extra = {}) => { emit('pointerdown', x, y, extra); emit('pointerup', x, y, extra); return emit('click', x, y, extra) }
  return { canvas, scope, emit, tap, cleanup, closes: () => closes, clicksThrough: () => clicksThrough }
}

test('an outside tap dismisses once and cannot click through to another object', () => {
  const s = setup(), click = s.tap(15, 15)
  assert.equal(s.closes(), 1)
  assert.equal(click.defaultPrevented, true)
  assert.equal(s.clicksThrough(), 0)
  s.emit('click'); assert.equal(s.closes(), 1)
  s.cleanup()
})
test('inside taps and gestures crossing the object edge preserve focus', () => {
  const s = setup()
  s.tap(60, 60)
  s.emit('pointerdown', 38, 60); s.emit('pointerup', 42, 60); s.emit('click', 42, 60)
  s.emit('pointerdown', 42, 60); s.emit('pointerup', 38, 60); s.emit('click', 38, 60)
  assert.equal(s.closes(), 0)
  s.cleanup()
})
test('a drag returning to its starting point is still a drag', () => {
  const s = setup()
  s.emit('pointerdown'); s.emit('pointermove', 30, 15); s.emit('pointermove', 15, 15); s.emit('pointerup'); s.emit('click')
  assert.equal(s.closes(), 0)
  s.cleanup()
})
test('cancelled scrolls, multi-touch and window blur discard pending taps', () => {
  for (const cancel of ['pointercancel', 'blur', 'second touch']) {
    const s = setup()
    s.emit('pointerdown')
    if (cancel === 'second touch') s.emit('pointerdown', 18, 18, { pointerId: 2, isPrimary: false })
    else s.emit(cancel)
    s.emit('pointerup'); s.emit('click')
    assert.equal(s.closes(), 0, cancel)
    s.cleanup()
  }
})
test('right clicks, keyboard clicks and unrelated controls do not dismiss', () => {
  const s = setup()
  s.tap(15, 15, { button: 2 })
  s.tap(15, 15, { detail: 0 })
  const control = new EventTarget()
  control.dispatchEvent(new Event('click'))
  assert.equal(s.closes(), 0)
  s.cleanup()
})
test('cleanup clears in-flight input and removes event listeners', () => {
  const s = setup()
  s.emit('pointerdown'); s.emit('pointerup'); s.cleanup(); s.emit('click')
  s.tap(15, 15)
  assert.equal(s.closes(), 0)
})
