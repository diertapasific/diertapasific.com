import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const moduleURL = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const opening = await import(moduleURL(compile(await readFile(new URL('../src/desk/opening.ts', import.meta.url), 'utf8'))))
const { initialOpeningMode, openingDuration, createOpeningTimeline, advanceOpening, openingFrame, openingPose } = opening
const motionURL = moduleURL(compile(await readFile(new URL('../src/desk/motion.ts', import.meta.url), 'utf8')))
const modelCode = compile(await readFile(new URL('../src/desk/model.ts', import.meta.url), 'utf8')).replace("'./motion'", `'${motionURL}'`)
const { overviewPose, deskHeight } = await import(moduleURL(modelCode))

test('home arrivals are automatic; direct content links do not wait for a cutscene', () => {
  assert.equal(initialOpeningMode(null, false, false), 'full')
  assert.equal(initialOpeningMode(null, true, false), 'return')
  assert.equal(initialOpeningMode(null, false, true), 'return')
  for (const id of ['projects', 'about', 'reading', 'music', 'writing', 'contact']) assert.equal(initialOpeningMode(id, false, false), 'none')
})

test('the opening completes at the same duration at 30, 60 and 120 fps', () => {
  for (const mode of ['full', 'return']) for (const fps of [30, 60, 120]) {
    const state = createOpeningTimeline(mode)
    const frames = Math.round(openingDuration[mode] * fps)
    for (let i = 0; i < frames - 1; i++) advanceOpening(state, 1 / fps)
    assert.ok(state.progress < 1)
    advanceOpening(state, 1 / fps)
    assert.equal(state.progress, 1)
    advanceOpening(state, 1 / fps)
    assert.equal(state.progress, 1)
  }
})

test('hidden tabs pause, invalid frame times are ignored and long stalls cannot jump to the end', () => {
  const state = createOpeningTimeline('full')
  for (let i = 0; i < 100; i++) advanceOpening(state, 1, false)
  assert.equal(state.progress, 0)
  for (const delta of [NaN, Infinity, -3]) advanceOpening(state, delta)
  assert.equal(state.progress, 0)
  advanceOpening(state, 30)
  assert.ok(state.progress > 0 && state.progress < .03)
})

test('geometry, camera and UI settle in order without overshoot or collapsed transforms', () => {
  let previous = openingFrame(0, 'full')
  for (let i = 1; i <= 1000; i++) {
    const frame = openingFrame(i / 1000, 'full')
    for (const key of Object.keys(frame)) {
      assert.ok(Number.isFinite(frame[key]) && frame[key] >= previous[key] && frame[key] <= 1, key)
    }
    assert.ok(frame.depth >= .025)
    if (frame.copy > 0 || frame.screen > 0) assert.equal(frame.depth, 1)
    if (frame.labels > 0) { assert.equal(frame.camera, 1); assert.equal(frame.trace, 1); assert.equal(frame.paper, 1) }
    previous = frame
  }
  assert.ok(Object.values(openingFrame(1, 'full')).every(value => value === 1))
})

test('the short return keeps the desk at full depth and the camera at its default view', () => {
  for (let i = 0; i <= 100; i++) {
    const frame = openingFrame(i / 100, 'return')
    for (const key of ['depth', 'camera', 'trace', 'ink', 'paper']) assert.equal(frame[key], 1)
  }
  assert.ok(Object.values(openingFrame(0, 'none')).every(value => value === 1))
})

test('camera hands over exactly to the responsive overview, including fitted mobile labels', () => {
  for (const [width, height, fittedZoom] of [[1280, 800, undefined], [390, 844, 21.3], [375, 667, 18.7], [844, 390, undefined]]) {
    const view = overviewPose(width, height, { x: 0, y: 0 }, true, fittedZoom)
    for (const mode of ['full', 'return', 'none']) {
      assert.deepEqual(openingPose(view, deskHeight(true), 1, mode), view)
      assert.deepEqual(openingPose(view, deskHeight(true), .9999, mode), view)
    }
    const start = openingPose(view, deskHeight(true), 0, 'full')
    const offset = start.position.map((value, i) => value - start.target[i])
    assert.ok(offset[1] / Math.hypot(...offset) > .98, 'starts almost overhead')
    for (let p = 0; p <= 1; p += .01) {
      const pose = openingPose(view, deskHeight(true), p, 'full')
      assert.ok([...pose.target, ...pose.position, pose.zoom].every(Number.isFinite))
      assert.ok(pose.position[1] > pose.target[1] && pose.zoom > 0)
    }
  }
})
