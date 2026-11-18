import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { Matrix4, OrthographicCamera, Quaternion, Vector3 } from 'three'

const compile = async name => ts.transpileModule(await readFile(new URL(`../src/desk/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const url = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
const three = new URL('../node_modules/three/build/three.module.js', import.meta.url).href
const { createCameraMotion, advanceCameraMotion } = await import(url((await compile('cameraMotion')).replace("'three'", JSON.stringify(three))))
const { surfacePresentation, createSurfaceTracker, surfaceHasSettled } = await import(url(await compile('surfaceProjection')))

test('top-down paper alignment settles upright even with one rendered frame per second', () => {
  for (const delta of [1 / 60, 1 / 30, .2, 1]) for (const yaw of [-.22, .43, 1.08]) {
    const camera = new OrthographicCamera(-195, 195, 360, -360, .1, 100)
    camera.position.set(Math.sin(yaw) * 13, 8, Math.cos(yaw) * 13)
    camera.lookAt(0, 2.5, 0); camera.zoom = 27
    const motion = createCameraMotion(), target = new Vector3(3.1, 3.8, 1.4), position = target.clone().add(new Vector3(0, 9, .001)), up = new Vector3(0, 0, -1)
    const desired = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, up))
    for (let time = 0; time < 3; time += delta) advanceCameraMotion(camera, motion, position, target, up, 240, delta)
    assert.ok(camera.position.distanceTo(position) < 1e-6, `camera reaches the paper at ${1 / delta}fps`)
    assert.ok(camera.quaternion.angleTo(desired) < 1e-6, 'no residual roll near the vertical camera direction')
    assert.equal(camera.zoom, 240)
    camera.updateMatrixWorld()
    const left = target.clone().add(new Vector3(-.575, 0, -.8)).project(camera), right = target.clone().add(new Vector3(.575, 0, -.8)).project(camera)
    assert.ok(Math.abs(left.y - right.y) < 1e-8, 'the top edge of the paper is horizontal')
  }
})

test('camera travel remains smooth at normal frame rates and accepts an immediate reset', () => {
  const camera = new OrthographicCamera(), motion = createCameraMotion()
  camera.position.set(8, 8, 12); camera.lookAt(0, 2.5, 0)
  const before = camera.quaternion.clone(), position = new Vector3(2, 12, 1), target = new Vector3(2, 3, 1), up = new Vector3(0, 0, -1)
  const desired = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, up))
  advanceCameraMotion(camera, motion, position, target, up, 180, 1 / 60)
  assert.ok(camera.quaternion.angleTo(before) > 0)
  assert.ok(camera.quaternion.angleTo(before) < before.angleTo(desired) * .2, 'normal frames do not jump to the final orientation')
  advanceCameraMotion(camera, motion, position, target, up, 180, 0, true)
  assert.deepEqual(camera.position, position); assert.ok(camera.quaternion.angleTo(desired) < 1e-6); assert.equal(camera.zoom, 180)
})

test('landed papers drop their transform while travelling papers keep the projected pose', () => {
  const landed = surfacePresentation({ a: 1.0004, b: .0001, c: -.0001, d: .9998, x: 35.3, y: 145.7, width: 320, height: 440 }, true)
  assert.deepEqual(landed, { mode: 'native', left: '35px', top: '146px', transform: 'none' })
  const moving = surfacePresentation({ a: .8, b: .3, c: -.1, d: .9, x: 12, y: 40, width: 320, height: 440 }, true)
  assert.equal(moving.mode, 'projected'); assert.equal(moving.left, '0px'); assert.equal(moving.top, '0px'); assert.match(moving.transform, /^matrix\(/)
  const existing = surfacePresentation({ a: 1, b: 0, c: 0, d: 1, x: 35.3, y: 145.7, width: 320, height: 440 })
  assert.equal(existing.transform, 'matrix(1,0,0,1,35,146)', 'other desk surfaces keep their existing projection mode')
})


test('a sheet moving across a square-on camera keeps using transforms until it parks', () => {
  const tracker = createSurfaceTracker()
  for (const x of [35, 30, 20, 5, -15]) {
    const presentation = surfacePresentation({ a: 1, b: 0, c: 0, d: 1, x, y: 140, width: 320, height: 440 }, surfaceHasSettled(tracker, x, 140))
    assert.match(presentation.transform, /^matrix/); assert.equal(presentation.left, '0px')
  }
  for (let frame = 0; frame < 3; frame++) surfaceHasSettled(tracker, -15, 140)
  const parked = surfacePresentation({ a: 1, b: 0, c: 0, d: 1, x: -15, y: 140, width: 320, height: 440 }, surfaceHasSettled(tracker, -15, 140))
  assert.equal(parked.transform, 'none'); assert.equal(parked.left, '-15px')
})
