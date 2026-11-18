import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { Euler, Matrix4, OrthographicCamera, Quaternion, Vector3 } from 'three'
import { OBB } from 'three/addons/math/OBB.js'

// Test the same motion functions used by useFrame, without a browser or a new
// test dependency. Bounds conservatively enclose the rounded scene geometry.
const source = await readFile(new URL('../src/desk/motion.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { advanceDeskMotion, bookPose, cardPose, contentIsReady, createDeskMotion, motionProgress, paperPose, speakerPosition, speakerScale, speakerViewOffset, mousePosition, mouseScale, deskSize, deskControlPosition, bookPoses, monitorDepth, paperPosition, keyboardPosition, deskmatPosition } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const modelSource = await readFile(new URL('../src/desk/model.ts', import.meta.url), 'utf8')
const modelCode = ts.transpileModule(modelSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText.replace("'./motion'", `'data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}'`)
const { focusView, overviewView, overviewPose } = await import(`data:text/javascript;base64,${Buffer.from(modelCode).toString('base64')}`)
const paperSource = await readFile(new URL('../src/desk/paperMotion.ts', import.meta.url), 'utf8')
const paperCode = ts.transpileModule(paperSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { samplePaper, paperSize, bookPage, bookSpineX, paperElevation, paperGutter, paperReach, createPaperSurface, updatePaperSurface } = await import(`data:text/javascript;base64,${Buffer.from(paperCode).toString('base64')}`)
const articleSource = await readFile(new URL('../src/desk/articleMotion.ts', import.meta.url), 'utf8')
const articleCode = ts.transpileModule(articleSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { articleStackPose, articleDisplayHeight, articleTurnPose, advancePaperDeck, createPaperDeck } = await import(`data:text/javascript;base64,${Buffer.from(articleCode).toString('base64')}`)
const ids = ['projects', 'about', 'reading', 'music', 'writing', 'contact']
const identity = new Matrix4()
const transform = (p = [0, 0, 0], r = [0, 0, 0], scale = 1) => new Matrix4().compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...r)), new Vector3(scale, scale, scale))

function box(owner, name, size, p, r = [0, 0, 0], parent = identity) {
  const half = new Vector3(...size).multiplyScalar(.5).subScalar(.002)
  return { owner, name, bounds: new OBB(new Vector3(), half).applyMatrix4(parent.clone().multiply(transform(p, r))) }
}

function bookBounds(id, pose) {
  const root = transform(pose.position, [0, pose.yaw, 0])
  const hinge = root.clone().multiply(transform([-.65, .1, 0], [0, 0, pose.cover]))
  return [
    box(id, `${id} pages`, [1.25, .105, 1.59], [.015, .03, 0], [0, 0, 0], root),
    box(id, `${id} bottom cover`, [1.32, .045, 1.68], [0, -.035, 0], [0, 0, 0], root),
    box(id, `${id} moving cover`, [1.32, .035, 1.68], [.65, 0, 0], [0, 0, 0], hinge),
  ]
}

const monitorRoot = transform([0, 0, monitorDepth + 1])
const speakerRoot = transform(speakerPosition, [0, 0, 0], speakerScale)
const stationary = [
  box('desk', 'tabletop', deskSize, [0, 0, 0]),
  box('desk', 'height controller', [.72, .23, .15], deskControlPosition),
  box('mat', 'deskmat', [4.7, .018, 1.82], deskmatPosition),
  box('projects', 'monitor', [4.4, 1.92, .12], [.2, 1.57, -1], [0, 0, 0], monitorRoot),
  box('projects', 'monitor clamp', [.26, .14, .36], [.2, .06, -2.34], [0, 0, 0], monitorRoot),
  box('projects', 'monitor arm stem', [.12, 1.20, .12], [.2, .72, -2.27], [0, 0, 0], monitorRoot),
  box('projects', 'monitor arm lower link', [.14, .14, .76], [.2, 1.32, -1.96], [-.12, 0, 0], monitorRoot),
  box('projects', 'monitor arm upper link', [.13, .13, .60], [.2, 1.42, -1.37], [-.20, 0, 0], monitorRoot),
  box('projects', 'monitor VESA mount', [.30, .34, .10], [.2, 1.57, -1.11], [0, 0, 0], monitorRoot),
  box('shelf', 'monitor shelf', [4.4, .08, 1.12], [.2, .31, -.93], [0, 0, 0], monitorRoot),
  ...[-1.8, 1.8].map(x => box('shelf', 'shelf foot', [.14, .19, .84], [x + .2, .175, -.93], [0, 0, 0], monitorRoot)),
  box('keyboard', 'keyboard', [2.2, .12, .98], [keyboardPosition[0], keyboardPosition[1] + .015, keyboardPosition[2]], [-.055, 0, 0]),
  box('mouse', 'mouse including wheels', [.84, .42, .99], [-.05, .21, 0], [0, 0, 0], transform(mousePosition, [0, -.1, 0], mouseScale)),
  box('shelf-items', 'Formula 1 miniature', [.98, .235, .43], [-.84, .4675, -.61], [0, 0, 0], monitorRoot),
  box('shelf-items', 'silver glasses', [.84, .24, .80], [.98, .472, -.76], [0, 0, 0], monitorRoot),
  box('music', 'speaker enclosure', [1.58, 1.495, .74], [0, -.1875, 0], [0, 0, 0], speakerRoot),
  ...[-.56, .56].map(x => box('music', 'speaker foot', [.14, .07, .46], [x, -.97, 0], [0, 0, 0], speakerRoot)),
  box('music', 'speaker knob', [.18, .075, .18], [.52, .598, .035], [0, 0, 0], speakerRoot),
  ...[0, 1].map(i => box('reading-stack', 'book stack', [1.25, .12, 1.49], [bookPoses.reading.rest[0], bookPoses.reading.rest[1] - .26 + i * .13, bookPoses.reading.rest[2]], [0, i ? -.09 : .12, 0])),
  box('pen', 'pen', [.06, .06, .94], [paperPosition[0] + .75, .14, paperPosition[2] - .05], [0, -.12, 0]),
]

function sceneBounds(state) {
  const p = id => motionProgress(state, id)
  const card = cardPose(p('contact'))
  return [
    ...stationary,
    ...bookBounds('about', bookPose('about', p('about'))),
    ...bookBounds('reading', bookPose('reading', p('reading'))),
    ...Array.from({ length: 5 }, (_, i) => { const pose = articleStackPose(i); return box('writing', `stack sheet ${i + 1}`, [1.2, .014, 1.65], [paperPosition[0], pose.height, paperPosition[2]], [0, pose.yaw, 0]) }),
    box('writing', 'selected article', [1.2, .014, 1.65], [paperPosition[0], articleDisplayHeight(p('writing')), paperPosition[2]]),
    // Extra X/Y clearance includes the ID card's small resting sway.
    box('contact', 'ID card', [.70 * card.scale, .99 * card.scale, .13 * card.scale], card.position),
  ]
}

function assertClear(state, label) {
  const volumes = sceneBounds(state)
  for (let a = 0; a < volumes.length; a++) for (let b = a + 1; b < volumes.length; b++) {
    if (volumes[a].owner === volumes[b].owner) continue
    // The monitor's fixed clamp intentionally passes through the desktop edge.
    if (volumes[a].name === 'tabletop' && volumes[b].name === 'monitor clamp') continue
    assert.ok(!volumes[a].bounds.intersectsOBB(volumes[b].bounds), `${label}: ${volumes[a].name} intersects ${volumes[b].name}; ${state.id} @ ${state.progress.toFixed(4)}`)
  }
}

test('all six complete opening and closing paths clear adjacent objects', () => {
  for (const id of ids) for (let step = 0; step <= 1000; step++) assertClear({ id, progress: step / 1000 }, 'path sweep')
})

test('the notebook page clears desk objects through forward and reverse turns', () => {
  for (const id of ['about', 'reading']) {
    const pose = bookPose(id, 1), root = transform(pose.position, [0, pose.yaw, 0])
    const neighbors = sceneBounds({ id, progress: 1 }).filter(volume => volume.owner !== id)
    const envelope = box(id, 'page curl envelope', [2.61, 1.31, 1.61], [-.65, .776, 0], [0, 0, 0], root)
    for (const other of neighbors) assert.ok(!envelope.bounds.intersectsOBB(other.bounds), `${id} page envelope intersects ${other.name}`)
  }
  const p = { x: 0, y: 0, z: 0, shade: 1 }
  for (let step = 0; step <= 200; step++) for (const z of [-.8, 0, .8]) for (let col = 0; col <= 48; col++) {
    samplePaper(step / 200, paperGutter + col / 48 * paperSize.width, z, p)
    assert.ok(Math.abs(p.x) <= 1.300001 && p.y >= -.000001 && p.y <= 1.300001, 'paper remains inside the collision-tested envelope')
  }
})

test('article shuffles clear both sheets, the stack, mouse, and shelf objects', () => {
  const neighbors = sceneBounds({ id: 'writing', progress: 1 }).filter(v => v.owner !== 'writing')
  const stack = Array.from({ length: 4 }, (_, i) => { const pose = articleStackPose(i); return box('writing', `stack ${i}`, [1.2, .014, 1.65], [paperPosition[0], pose.height, paperPosition[2]], [0, pose.yaw, 0]) })
  let previous
  for (let step = 0; step <= 1000; step++) {
    const pose = articleTurnPose(step / 1000)
    const outgoing = box('writing', 'outgoing paper', [1.2, .016 + pose.bend, 1.65], [paperPosition[0] + pose.x, pose.height + .008 + pose.bend / 2, paperPosition[2]])
    const incoming = box('writing', 'incoming paper', [1.2, .014, 1.65], [paperPosition[0], pose.incomingHeight, paperPosition[2]])
    for (const sheet of [outgoing, incoming]) for (const other of [...neighbors, ...stack]) assert.ok(!sheet.bounds.intersectsOBB(other.bounds), `${sheet.name} crosses ${other.name} at ${step / 1000}`)
    assert.ok(!outgoing.bounds.intersectsOBB(incoming.bounds), `sheets cross at ${step / 1000}`)
    if (previous) assert.ok(Math.hypot(pose.x - previous.x, pose.height - previous.height) < .015, 'no position jumps during the shuffle')
    previous = pose
  }
  for (let from = 0; from < 6; from++) for (let to = 0; to < 6; to++) {
    const deck = { index: from, requested: to, from: null, progress: 1 }
    for (let frame = 0; frame < 180; frame++) advancePaperDeck(deck, 1 / 60, false)
    assert.equal(deck.index, to); assert.equal(deck.progress, 1); assert.equal(deck.from, null)
  }
  const deck = createPaperDeck(); deck.requested = 5; advancePaperDeck(deck, 0, true)
  assert.equal(deck.index, 5); assert.equal(deck.progress, 1)
})

test('the speaker body and feet clear the book in the close-up projection', () => {
  const up = new Vector3(0, speakerViewOffset[2], -speakerViewOffset[1]).normalize()
  const projectedRange = ({ bounds }) => {
    const axes = [new Vector3(), new Vector3(), new Vector3()]; bounds.rotation.extractBasis(...axes)
    const radius = axes.reduce((sum, axis, i) => sum + Math.abs(up.dot(axis)) * bounds.halfSize.getComponent(i), 0)
    const center = up.dot(bounds.center)
    return { min: center - radius, max: center + radius }
  }
  const bookTop = Math.max(...bookBounds('about', bookPose('about', 0)).map(v => projectedRange(v).max))
  const speakerBottom = Math.min(...stationary.filter(v => v.owner === 'music').map(v => projectedRange(v).min))
  assert.ok(speakerBottom > bookTop + .05, 'the whole speaker remains above the book in screen space')
})

test('the folding page lands exactly on the flat page outline and height', () => {
  const point = { x: 0, y: 0, z: 0, shade: 1 }
  assert.equal(paperSize.height, bookPage.height)
  for (const progress of [0, 1]) for (const z of [-bookPage.height / 2, bookPage.height / 2]) {
    samplePaper(progress, paperReach, z, point)
    const edge = progress ? bookPage.leftX - bookPage.width / 2 : bookPage.rightX + bookPage.width / 2
    assert.ok(Math.abs(bookSpineX + point.x - edge) < 1e-8, 'outer edge stays registered')
    assert.ok(Math.abs(point.y + paperElevation(progress) - (progress ? bookPage.leftY : bookPage.rightY)) < 1e-8, 'sheet lands at the same height')
    assert.equal(point.z, z)
  }
  assert.ok(Math.abs(bookSpineX + paperGutter + paperSize.width / 2 - bookPage.rightX) < 1e-8)
  assert.ok(Math.abs(bookSpineX - paperGutter - paperSize.width / 2 - bookPage.leftX) < 1e-8)
})

test('paper stays attached, lands flat, and bends without stretching its width', () => {
  const point = { x: 0, y: 0, z: 0, shade: 1 }
  for (const progress of [0, .1, .25, .5, .75, .9, 1]) for (const z of [-.8, 0, .8]) {
    samplePaper(progress, 0, z, point)
    assert.ok(Math.abs(point.x) < 1e-8 && Math.abs(point.y) < 1e-8, 'spine remains attached')
    samplePaper(progress, paperGutter, z, point)
    let length = 0, previous = { ...point }
    for (let i = 1; i <= 256; i++) {
      samplePaper(progress, paperGutter + paperSize.width * i / 256, z, point)
      length += Math.hypot(point.x - previous.x, point.y - previous.y)
      previous = { ...point }
    }
    assert.ok(Math.abs(length - paperSize.width) < .00001, 'arc length preserves paper width')
    if (progress === 0 || progress === 1) assert.ok(Math.abs(point.y) < 1e-8 && Math.abs(Math.abs(point.x) - paperReach) < 1e-8, 'flat endpoints')
  }
  samplePaper(.5, paperSize.width / 2, 0, point)
  assert.ok(point.x > .2, 'middle of sheet bows away from the straight hinge plane')
})

test('a new page mesh starts on the correct side before its first animation frame', () => {
  for (const forward of [true, false]) {
    const surface = createPaperSurface(forward)
    for (let i = 0; i < surface.positions.length; i += 3) {
      assert.ok(Math.abs(surface.positions[i + 1]) < 1e-7, 'initial sheet lies flat')
      assert.ok(forward ? surface.positions[i] >= -1e-7 : surface.positions[i] <= 1e-7, 'initial vertices stay on the correct side of the spine')
    }
    const initial = surface.positions.slice()
    updatePaperSurface(surface, forward ? 0 : 1)
    assert.deepEqual(surface.positions, initial, 'the first frame cannot jump from a centered vertical plane')
    updatePaperSurface(surface, .5)
    assert.ok(surface.positions.some((v, i) => i % 3 === 1 && v > .3), 'the same mesh bends during the turn')
  }
})

test('every vertex matches the resting page at takeoff in either direction', () => {
  for (const forward of [true, false]) {
    const surface = createPaperSurface(forward)
    const start = forward ? 0 : 1, sign = forward ? 1 : -1
    const center = forward ? bookPage.rightX : bookPage.leftX
    for (let row = 0; row <= surface.rows; row++) for (let col = 0; col <= surface.columns; col++) {
      const i = (row * (surface.columns + 1) + col) * 3
      const expectedX = center + sign * (col / surface.columns - .5) * bookPage.width
      assert.ok(Math.abs(bookSpineX + surface.positions[i] - expectedX) < 1e-7, 'no extra sheet extends into the gutter')
      assert.ok(Math.abs(surface.positions[i + 2] - (row / surface.rows - .5) * bookPage.height) < 1e-7, 'top and bottom match the resting page')
    }
    const resting = surface.positions.slice()
    // The first real frame at 60fps uses the same easing as CurlingPage.
    const t = (1 / 60) / 1.15, eased = t ** 3 * (t * (t * 6 - 15) + 10)
    updatePaperSurface(surface, forward ? eased : start - eased)
    for (let i = 0; i < resting.length; i += 3) {
      assert.ok(Math.hypot(...[0, 1, 2].map(axis => surface.positions[i + axis] - resting[i + axis])) < .0002, 'first motion is continuous with the resting sheet')
    }
  }
})

test('every direct section switch, including desk return, settles without collisions', () => {
  for (const dt of [1 / 120, 1 / 30, .2]) for (const from of [null, ...ids]) for (const to of [null, ...ids]) {
    const state = { id: from, progress: from ? 1 : 0 }
    for (let frame = 0; frame < Math.ceil(3 / Math.min(dt, .05)); frame++) {
      advanceDeskMotion(state, to, dt, false)
      assertClear(state, `${from} -> ${to}`)
    }
    assert.equal(state.id, to)
    assert.equal(state.progress, to ? 1 : 0)
  }
})

test('rapid requests, reversals, and reduced motion keep only one object out', () => {
  const state = createDeskMotion()
  for (let frame = 0; frame < 1200; frame++) {
    const requested = frame % 137 < 8 ? null : ids[Math.floor(frame / 11) % ids.length]
    advanceDeskMotion(state, requested, 1 / 60, frame % 79 === 0)
    assertClear(state, 'rapid navigation')
    if (contentIsReady(state, requested)) assert.equal(state.id, requested)
  }
  advanceDeskMotion(state, 'reading', 0, true)
  assert.equal(state.progress, 1)
  assertClear(state, 'reduced motion')
  advanceDeskMotion(state, null, 0, true)
  assert.deepEqual(state, { id: null, progress: 0 })
})

test('collision fixtures detect the former monitor, paper, ID, and speaker intersections', () => {
  const oldBook = bookBounds('reading', { position: [2.7, .54, -.65], yaw: 0, cover: Math.PI })
  const monitor = stationary.find(v => v.name === 'monitor')
  assert.ok(oldBook.some(v => v.bounds.intersectsOBB(monitor.bounds)))
  const oldCard = box('contact', 'old ID', [.76 * 1.6, 1.08 * 1.6, .035 * 1.6], [2.75, .5, 2.2])
  assert.ok(oldCard.bounds.intersectsOBB(box('desk', 'old height controller', [.72, .23, .15], [2, -.15, 2.12]).bounds))
  const openBook = bookBounds('reading', { position: [2.7, .54, 1.1], yaw: 0, cover: Math.PI })
  const simultaneousPaper = box('writing', 'old moving article', [1.2, .018, 1.65], [3.12, .55, 1.2])
  assert.ok(openBook.some(v => v.bounds.intersectsOBB(simultaneousPaper.bounds)))
  const oldSpeakerRoot = transform([-3.12, .69, -1.25])
  const oldHinge = oldSpeakerRoot.clone().multiply(transform([0, .54, .27], [-Math.PI / 2, 0, 0]))
  const oldDisplay = box('music-display', 'old display', [1.3, 1.55, .055], [0, .775, 0], [0, 0, 0], oldHinge)
  assert.ok(box('music', 'old speaker knob', [.13, .07, .13], [-.48, .575, .1], [0, 0, 0], oldSpeakerRoot).bounds.intersectsOBB(oldDisplay.bounds))
})


test('both pages of each book fit together on phones and desktops', () => {
  for (const [width, height] of [[320, 568], [375, 667], [393, 852], [430, 932], [767, 1024], [1280, 800], [844, 390], [740, 390], [568, 320], [390, 430]]) {
    for (const id of ['about', 'reading']) {
      const view = focusView(id, width, height)
      const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 100)
      const target = new Vector3(...view.target); target.y += 3.1; target.z += view.shift / view.zoom
      camera.position.copy(target).add(new Vector3(...view.offset)); camera.zoom = view.zoom
      camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld()
      for (const side of ['left', 'right']) {
        const x = side === 'left' ? bookPage.leftX : bookPage.rightX
        const y = side === 'left' ? bookPage.leftY : bookPage.rightY
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const corner = new Vector3(bookPoses[id].open[0] + x + sx * bookPage.width / 2, bookPoses[id].open[1] + y + 3.1, bookPoses[id].open[2] + sz * bookPage.height / 2).project(camera)
          const screenX = (corner.x + 1) * width / 2, screenY = (1 - corner.y) * height / 2
          assert.ok(screenX >= 16 && screenX <= width - 16, `${id} ${side} fits alongside the other page at ${width}`)
          assert.ok(screenY > (height < 550 ? 108 : 130) && screenY < height - (height < 550 ? 80 : 132), `${id} ${side} clears navigation at ${width} x ${height}`)
        }
      }
    }
  }
})

const annotationSource = await readFile(new URL('../src/desk/annotationLayout.ts', import.meta.url), 'utf8')
const annotationCode = ts.transpileModule(annotationSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { annotationRect, annotationVisualSize, intersects } = await import(`data:text/javascript;base64,${Buffer.from(annotationCode).toString('base64')}`)
const geometrySource = await readFile(new URL('../src/desk/annotationGeometry.ts', import.meta.url), 'utf8')
const geometryCode = ts.transpileModule(geometrySource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText.replace("'./motion'", `'data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}'`)
const { annotationObjects, annotationObstacles } = await import(`data:text/javascript;base64,${Buffer.from(geometryCode).toString('base64')}`)

const planSource = await readFile(new URL('../src/desk/annotationPlan.ts', import.meta.url), 'utf8')
const planCode = ts.transpileModule(planSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
  .replace("'three'", JSON.stringify(new URL('../node_modules/three/build/three.module.js', import.meta.url).href))
  .replace("'./model'", `'data:text/javascript;base64,${Buffer.from(modelCode).toString('base64')}'`)
  .replace("'./annotationGeometry'", `'data:text/javascript;base64,${Buffer.from(geometryCode).toString('base64')}'`)
  .replace("'./annotationLayout'", `'data:text/javascript;base64,${Buffer.from(annotationCode).toString('base64')}'`)
const { createAnnotationPlan } = await import(`data:text/javascript;base64,${Buffer.from(planCode).toString('base64')}`)

test('all six mobile cards follow their objects continuously without changing offsets', () => {
  for (const [width, height] of [[320, 480], [320, 568], [360, 600], [375, 667], [393, 852], [430, 932], [740, 390], [767, 1024]]) {
    const area = { left: 12, right: width - 12, top: 92, bottom: height - (width < 360 ? 161 : 148) }
    const chrome = [
      { left: 20, right: height < 700 ? 225 : 254, top: height < 540 ? 84 : height < 700 ? 92 : 105, bottom: height < 540 ? 162 : height < 700 ? 184 : 231 },
      { left: 20, right: width - 50, top: height - 158, bottom: height - 143 },
      { left: width - 36, right: width - 20, top: height - 185, bottom: height - 141 },
    ]
    const plan = createAnnotationPlan(width, height, area, chrome, 3.1)
    assert.ok(plan, `all six cards fit at ${width} x ${height}`)
    assert.equal(plan.offsets.length, 6)
    assert.ok(plan.zoom <= overviewView(width, height).zoom)
    const initial = JSON.stringify(plan.offsets)
    const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 100)
    // Test more angles than the planner samples, including the spaces between
    // samples. The same object offsets remain clear at every intermediate camera pose.
    for (let x = 0; x <= 32; x++) for (let y = 0; y <= 16; y++) {
      const orbit = { x: -.65 + x * 1.3 / 32, y: -.23 + y * .53 / 16 }
      const pose = overviewPose(width, height, orbit, true, plan.zoom)
      camera.position.set(...pose.position); camera.lookAt(...pose.target)
      camera.zoom = pose.zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld()
      const obstacles = annotationObstacles.map(({ center, size }) => {
        const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const v = new Vector3(center[0] + sx * size[0] / 2, center[1] + 3.1 + sy * size[1] / 2, center[2] + sz * size[2] / 2).project(camera)
          const px = (v.x + 1) * width / 2, py = (1 - v.y) * height / 2
          rect.left = Math.min(rect.left, px); rect.right = Math.max(rect.right, px)
          rect.top = Math.min(rect.top, py); rect.bottom = Math.max(rect.bottom, py)
        }
        return rect
      })
      const anchorPoints = annotationObjects.map(item => { const v = new Vector3(item.anchor[0], item.anchor[1] + 3.1, item.anchor[2]).project(camera); return { x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2 } })
      const positions = plan.offsets.map((offset, i) => ({ x: anchorPoints[i].x + offset.x, y: anchorPoints[i].y + offset.y }))
      positions.forEach((point, i) => {
        const rect = annotationRect(point)
        assert.ok(rect.left >= area.left && rect.right <= area.right && rect.top >= area.top && rect.bottom <= area.bottom)
        assert.ok(obstacles.every(obstacle => !intersects(annotationRect(point, annotationVisualSize), obstacle, 5)), `visible card ${i} clears objects at ${width}, camera ${x}/${y}`)
        assert.ok(chrome.every(obstacle => !intersects(rect, obstacle, 5)), `card ${i} clears navigation at ${width}, camera ${x}/${y}`)
        assert.ok(positions.every((other, j) => i === j || !intersects(rect, annotationRect(other), 3)))
      })
      assert.equal(JSON.stringify(plan.offsets), initial, 'camera motion cannot change a card offset')
    }
    assert.deepEqual(createAnnotationPlan(width, height, area, chrome, 3.1)?.offsets, plan.offsets, 'returning to the overview restores the same offsets')
  }
})


test('the reading book opens above its own stack and stays within its desk corner', () => {
  const rest = bookPoses.reading.rest, open = bookPose('reading', 1)
  for (let step = 0; step <= 100; step++) {
    const pose = bookPose('reading', step / 100)
    assert.equal(pose.position[2], rest[2], 'the book never travels forward into the mouse zone')
  }
  assert.ok(Math.abs(open.position[0] - .65 - rest[0]) < .3, 'the open spread stays centered over the bookshelf zone')
  assert.ok(open.position[1] > rest[1], 'the book lifts clear of the stack')
  for (const volume of bookBounds('reading', open)) {
    const { center, halfSize, rotation } = volume.bounds
    const axes = [new Vector3(), new Vector3(), new Vector3()]; rotation.extractBasis(...axes)
    for (const axis of [0, 2]) {
      const radius = axes.reduce((sum, vector, i) => sum + Math.abs(vector.getComponent(axis)) * halfSize.getComponent(i), 0)
      assert.ok(Math.abs(center.getComponent(axis)) + radius <= deskSize[axis] / 2, 'the spread fits above the tabletop')
    }
  }
})

const objectSource = await readFile(new URL('../src/desk/objectMotion.ts', import.meta.url), 'utf8')
const objectCode = ts.transpileModule(objectSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const { miniatureHome, miniatureRoll, miniatureRollDuration, advanceIdFlip, idCardZ, createIdReveal, advanceIdReveal, idRevealDuration } = await import(`data:text/javascript;base64,${Buffer.from(objectCode).toString('base64')}`)

test('the miniature rolls on its shelf, clears every open object, and parks exactly at home', () => {
  let previous = 0
  for (let frame = 0; frame <= 240; frame++) {
    const elapsed = frame / 240 * miniatureRollDuration, offset = miniatureRoll(elapsed)
    assert.ok(offset >= -.48 && offset <= 0)
    assert.ok(Math.abs(offset - previous) < .007, 'the miniature never jumps between frames')
    previous = offset
    const car = box('miniature', 'rolling F1 miniature', [.99, .235, .47], [miniatureHome[0] + offset, .4675, miniatureHome[2]], [0, -.04, 0], monitorRoot)
    const shelfLeft = .2 - 2.2
    assert.ok(car.bounds.center.x - .51 >= shelfLeft, 'front wing stays on the shelf')
    for (const id of ids) for (const neighbor of sceneBounds({ id, progress: 1 }).filter(v => v.name !== 'Formula 1 miniature')) {
      assert.ok(!car.bounds.intersectsOBB(neighbor.bounds), `rolling miniature intersects ${neighbor.name} while ${id} is open`)
    }
  }
  assert.equal(miniatureRoll(-1), 0); assert.equal(miniatureRoll(miniatureRollDuration), 0); assert.equal(miniatureRoll(20), 0)
})

test('the physical ID clears its neighbors throughout a flip and an interrupted return', () => {
  function assertCardClear(state, angle) {
    const progress = motionProgress(state, 'contact'), pose = cardPose(progress)
    const position = [...pose.position]; position[2] = idCardZ(position[2], pose.scale, progress, angle, deskSize[2] / 2)
    const parent = transform(position, [0, -.14 * (1 - progress), .098 * (1 - progress)], pose.scale).multiply(transform([0, 0, 0], [0, angle, 0]))
    const card = box('contact', 'flipping ID', [.60, .92, .05], [0, 0, 0], [0, 0, 0], parent)
    for (const neighbor of sceneBounds(state).filter(v => v.owner !== 'contact')) assert.ok(!card.bounds.intersectsOBB(neighbor.bounds), `ID intersects ${neighbor.name}, progress ${progress}, flip ${angle}`)
  }
  for (const direction of [-1, 1]) for (let phase = 0; phase <= 200; phase++) assertCardClear({ id: 'contact', progress: 1 }, direction * phase / 200 * Math.PI)
  for (const direction of [-1, 1]) for (const turnFrames of [3, 10, 20, 90]) {
    const state = { id: 'contact', progress: 1 }, flip = { angle: 0, velocity: 0 }
    for (let frame = 0; frame < turnFrames; frame++) { advanceIdFlip(flip, direction * Math.PI, 1 / 60); assertCardClear(state, flip.angle) }
    for (let frame = 0; frame < 180; frame++) {
      advanceDeskMotion(state, null, 1 / 60, false); advanceIdFlip(flip, 0, 1 / 60)
      assertCardClear(state, flip.angle)
    }
    assert.equal(flip.angle, 0)
  }
})

test('the ID spring stays continuous through rapid reversals and frame-rate changes', () => {
  for (const fps of [30, 60, 120]) {
    const flip = { angle: 0, velocity: 0 }
    for (let frame = 0; frame < fps * 2; frame++) {
      const old = flip.angle
      advanceIdFlip(flip, frame < fps / 3 ? Math.PI : 0, 1 / fps)
      assert.ok(Number.isFinite(flip.angle) && Math.abs(flip.angle - old) < .6)
    }
    assert.equal(flip.angle, 0); assert.equal(flip.velocity, 0)
  }
})


test('the ID opening hint runs once, keeps the portrait visible, and returns flat', () => {
  for (const fps of [30, 60, 120]) {
    const state = createIdReveal(), input = { selected: true, active: false, back: false, turning: false, reducedMotion: false }
    for (let i = 0; i < fps; i++) advanceIdReveal(state, input, 1 / fps)
    assert.equal(state.angle, 0); assert.equal(state.hinted, false)
    input.active = true
    let peak = 0, starts = 0, previous = idRevealDuration
    for (let i = 0; i < fps * 5; i++) {
      advanceIdReveal(state, input, 1 / fps)
      if (state.hintElapsed < previous) starts++
      previous = state.hintElapsed; peak = Math.min(peak, state.angle)
    }
    assert.equal(starts, 1)
    assert.ok(peak < -.15 && peak > -.4, 'the cue makes only a small left turn')
    assert.equal(state.angle, 0); assert.equal(state.velocity, 0)
    advanceIdReveal(state, { ...input, selected: false, active: false }, 1 / fps)
    advanceIdReveal(state, input, 1 / fps)
    assert.ok(state.hintElapsed < idRevealDuration, 'opening it again re-arms the cue')
  }
})

test('manual flips interrupt the cue continuously and reduced motion skips it', () => {
  const state = createIdReveal(), input = { selected: true, active: true, back: false, turning: false, reducedMotion: false }
  for (let i = 0; i < 24; i++) advanceIdReveal(state, input, 1 / 60)
  const angle = state.angle
  advanceIdReveal(state, { ...input, back: true, turning: true }, 1 / 60)
  assert.ok(Math.abs(state.angle - angle) < .2, 'clicking never snaps the physical card')
  for (let i = 0; i < 180; i++) advanceIdReveal(state, { ...input, back: true, turning: true }, 1 / 60)
  assert.equal(state.angle, -Math.PI)
  for (let i = 0; i < 180; i++) advanceIdReveal(state, { ...input, turning: true }, 1 / 60)
  assert.equal(state.angle, 0); assert.equal(state.hintElapsed, idRevealDuration)
  const reduced = createIdReveal()
  for (let i = 0; i < 120; i++) advanceIdReveal(reduced, { ...input, reducedMotion: true }, 1 / 60)
  assert.equal(reduced.angle, 0)
})

test('closing the ID during the hint keeps the card clear of the tabletop and neighbors', () => {
  for (const interrupt of [3, 10, 24, 45]) {
    const motion = { id: 'contact', progress: 1 }, state = createIdReveal()
    for (let i = 0; i < interrupt; i++) advanceIdReveal(state, { selected: true, active: true, back: false, turning: false, reducedMotion: false }, 1 / 60)
    for (let frame = 0; frame < 180; frame++) {
      advanceDeskMotion(motion, null, 1 / 60, false)
      advanceIdReveal(state, { selected: false, active: false, back: false, turning: false, reducedMotion: false }, 1 / 60)
      const progress = motionProgress(motion, 'contact'), pose = cardPose(progress), position = [...pose.position]
      position[2] = idCardZ(position[2], pose.scale, progress, state.angle, deskSize[2] / 2)
      const parent = transform(position, [0, -.14 * (1 - progress), .098 * (1 - progress)], pose.scale).multiply(transform([0, 0, 0], [0, state.angle, 0]))
      const card = box('contact', 'ID opening hint', [.60, .92, .05], [0, 0, 0], [0, 0, 0], parent)
      for (const neighbor of sceneBounds(motion).filter(v => v.owner !== 'contact')) assert.ok(!card.bounds.intersectsOBB(neighbor.bounds), `opening hint intersects ${neighbor.name}`)
    }
    assert.equal(state.angle, 0)
  }
})


test('rapid article choices queue the latest sheet and finish without a loading gate',()=>{
  const deck=createPaperDeck()
  deck.requested=1;advancePaperDeck(deck,1/60,false)
  assert.equal(deck.from,0);assert.equal(deck.index,1)
  deck.requested=3;deck.requested=5
  for(let frame=0;frame<180;frame++)advancePaperDeck(deck,1/60,false)
  assert.equal(deck.index,5);assert.equal(deck.from,null);assert.equal(deck.progress,1)
})
