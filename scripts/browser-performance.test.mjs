import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { BoxGeometry, Euler, Matrix4, Mesh, Vector3 } from 'three'

const source = await readFile(new URL('../src/desk/staticModel.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText.replace(/from '([^']+)'/g, (_, name) => `from '${import.meta.resolve(name)}'`)
const { createStaticModel, disposeStaticModel } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

test('rigid batching preserves every transformed triangle and material depth settings', () => {
  const model = createStaticModel(), expected = []
  for (const x of [-.31, .42]) {
    const matrix = new Matrix4().makeRotationFromEuler(new Euler(-.36, .17, .08)).setPosition(x, .14, -.18)
    const original = new BoxGeometry(.11, .075, .09).toNonIndexed().applyMatrix4(matrix)
    expected.push(...original.attributes.position.array); original.dispose()
    model.mesh(new BoxGeometry(.11, .075, .09), { color: '#f6f6f6', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }, matrix)
  }
  const group = model.finish()
  assert.equal(group.children.length, 1, 'identical rigid pieces must share a draw')
  const mesh = group.children[0]
  assert.ok(mesh instanceof Mesh)
  assert.equal(mesh.geometry.attributes.position.count, expected.length / 3)
  for (const [i, value] of mesh.geometry.attributes.position.array.entries()) assert.ok(Math.abs(value - expected[i]) < 1e-6)
  assert.equal(mesh.material.polygonOffset, true)
  assert.equal(mesh.material.polygonOffsetUnits, 1)
  disposeStaticModel(group)
})

test('line batching keeps paths disconnected and preserves their transformed endpoints', () => {
  const model = createStaticModel(), matrix = new Matrix4().makeRotationZ(.4).setPosition(.3, .2, -.1)
  const paths = [[[0, 0, 0], [.1, .2, 0], [.2, 0, 0]], [[.7, .3, .1], [.8, .4, .1]]]
  for (const path of paths) model.line(path, '#888888', matrix)
  const group = model.finish(), line = group.children[0]
  assert.equal(group.children.length, 1)
  assert.equal(line.material.linewidth, 1)
  assert.equal(line.geometry.attributes.instanceStart.count, 3, 'paths must not gain a connecting segment')
  const endpoint = new Vector3(.8, .4, .1).applyMatrix4(matrix)
  const actual = new Vector3().fromBufferAttribute(line.geometry.attributes.instanceEnd, 2)
  assert.ok(actual.distanceTo(endpoint) < 1e-6)
  disposeStaticModel(group)
})

test('batch teardown releases all owned geometry and materials', () => {
  const model = createStaticModel()
  model.mesh(new BoxGeometry(), { color: '#f6f6f6' }, new Matrix4())
  model.line([[0, 0, 0], [1, 0, 0]], '#888888', new Matrix4())
  const group = model.finish()
  let geometries = 0, materials = 0
  for (const object of group.children) {
    object.geometry.addEventListener('dispose', () => geometries++)
    object.material.addEventListener('dispose', () => materials++)
  }
  disposeStaticModel(group)
  assert.equal(geometries, 2)
  assert.equal(materials, 2)
})
