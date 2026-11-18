'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

// Explicit local fault controls, removed from the production build.
const command = 'desk-scene-check', sample = 'desk-scene-sample'
export function SceneDevProbe() {
  const { gl, get } = useThree()
  const profiling = useRef<{ dt: number; cpu: number }[] | null>(null)
  const started = useRef(0), frameDelta = useRef(0), lastFrame = useRef(-1)
  useFrame((_, dt) => { started.current = performance.now(); frameDelta.current = dt }, -100)
  const metrics = () => {
    const geometries = new Set(), buffers = new Set<ArrayBufferLike>(), materials = new Set()
    let objects = 0
    get().scene.traverse(object => {
      objects++
      const drawable = object as typeof object & { geometry?: import('three').BufferGeometry; material?: import('three').Material | import('three').Material[] }
      const geometry = drawable.geometry
      if (geometry && !geometries.has(geometry)) {
        geometries.add(geometry)
        for (const attribute of [...Object.values(geometry.attributes), ...(geometry.index ? [geometry.index] : [])]) {
          const data = 'data' in attribute ? attribute.data.array : attribute.array
          buffers.add(data.buffer)
        }
      }
      for (const material of drawable.material ? (Array.isArray(drawable.material) ? drawable.material : [drawable.material]) : []) materials.add(material)
    })
    return { calls: gl.info.render.calls, triangles: gl.info.render.triangles, lines: gl.info.render.lines, objects, materials: materials.size, geometryBytes: [...buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0), resources: { ...gl.info.memory, programs: gl.info.programs?.length } }
  }
  useEffect(() => addAfterEffect(() => {
    if (!profiling.current || lastFrame.current === gl.info.render.frame) return
    lastFrame.current = gl.info.render.frame
    profiling.current.push({ dt: frameDelta.current * 1000, cpu: performance.now() - started.current })
    if (profiling.current.length < 180) return
    const samples = profiling.current; profiling.current = null
    const stats = (key: 'dt' | 'cpu') => {
      const values = samples.map(sample => sample[key]).sort((a, b) => a - b)
      return { mean: Number((values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(2)), p95: Number(values[Math.floor(values.length * .95)].toFixed(2)), max: Number(values[values.length - 1].toFixed(2)) }
    }
    window.dispatchEvent(new CustomEvent(sample, { detail: { profile: true, frames: samples.length, intervalMs: stats('dt'), renderMainThreadMs: stats('cpu'), ...metrics() } }))
  }), [gl, get])
  const [crash, setCrash] = useState(false)
  const [rendererId] = useState(() => crypto.randomUUID())
  const trace = useRef<{ active: boolean; samples: { state: string; dt: number; zoom: number }[] }>({ active: true, samples: [] })
  useFrame(({ camera }, dt) => {
    if (!trace.current.active) return
    const state = document.querySelector<HTMLElement>('.scene-layer')?.dataset.readingScene || 'live'
    trace.current.samples.push({ state, dt: Number(dt.toFixed(4)), zoom: Number(camera.zoom.toFixed(3)) })
    if (trace.current.samples.filter(item => item.state === 'live').length >= 60) trace.current.active = false
  })
  useEffect(() => {
    const run = (event: Event) => {
      const action = (event as CustomEvent<string>).detail
      if (action === 'sample') {
        const size = gl.getDrawingBufferSize(new Vector2())
        window.dispatchEvent(new CustomEvent(sample, { detail: { rendererId, ...metrics(), trace: trace.current.samples, cameraZoom: get().camera.zoom, contextLost: gl.getContext().isContextLost(), frames: gl.info.render.frame, loop: get().frameloop, dpr: gl.getPixelRatio(), size: size.toArray(), antialias: gl.getContext().getContextAttributes()?.antialias } }))
      } else if (action === 'profile') profiling.current = []
      else if (action === 'trace-return') trace.current = { active: true, samples: [] }
      else if (action === 'lose-context') gl.getContext().getExtension('WEBGL_lose_context')?.loseContext()
      else if (action === 'render-error') setCrash(true)
    }
    window.addEventListener(command, run)
    return () => window.removeEventListener(command, run)
  }, [gl, get, rendererId])
  if (crash) throw new Error('Intentional local scene failure')
  return null
}

export function SceneDevTools() {
  const [report, setReport] = useState('')
  useEffect(() => {
    const receive = (event: Event) => setReport(JSON.stringify((event as CustomEvent).detail))
    window.addEventListener(sample, receive)
    return () => window.removeEventListener(sample, receive)
  }, [])
  const run = (action: string) => {
    if (action === 'sample' && document.querySelector('.scene-layer[data-reading-scene="paused"]') && !document.querySelector('.desk-renderer')) {
      const surface = document.querySelector<HTMLElement>('.scene-layer')
      setReport(JSON.stringify({ loop: 'unmounted', backdrop: Boolean(surface?.querySelector('[data-reading-backdrop]')), captureMs: surface?.dataset.readingCaptureMs }))
      return
    }
    window.dispatchEvent(new CustomEvent(command, { detail: action }))
  }
  return createPortal(<aside aria-label="Local scene checks" style={{ position: 'fixed', bottom: 130, left: 8, zIndex: 100, background: '#f6f6f6', color: '#333', padding: 8, fontSize: 11, maxWidth: 'calc(100% - 16px)' }}>
    <button onClick={() => run('sample')}>Sample scene</button>
    <button onClick={() => run('profile')}>Profile 180 frames</button>
    <button onClick={() => run('trace-return')}>Trace return</button>
    <button onClick={() => run('lose-context')}>Lose graphics context</button>
    <button onClick={() => run('render-error')}>Fail scene render</button>
    <button onClick={() => {
      const reader = document.querySelector<HTMLElement>('[data-native-writing-reader]')
      const sheet = reader?.querySelector<HTMLElement>('.writing-sheet')
      if (reader && sheet) reader.style.setProperty('-webkit-text-fill-color', getComputedStyle(sheet).getPropertyValue('--sheet-paper'))
    }}>Simulate inherited paper ink</button>
    <button onClick={() => {
      const reader = document.querySelector<HTMLElement>('[data-native-writing-reader]'), sheet = reader?.querySelector<HTMLElement>('.writing-sheet')
      if (!reader || !sheet) return
      const background = getComputedStyle(sheet).backgroundColor
      const nodes = [...sheet.querySelectorAll('.monitor-document p,.monitor-document h2,.monitor-document h3,.monitor-document strong,.monitor-document em')]
      setReport(JSON.stringify({ theme: sheet.dataset.theme, background, inherited: getComputedStyle(reader).getPropertyValue('-webkit-text-fill-color'), paragraphs: nodes.length, invisible: nodes.filter(node => getComputedStyle(node).getPropertyValue('-webkit-text-fill-color') === background).length, fills: [...new Set(nodes.map(node => getComputedStyle(node).getPropertyValue('-webkit-text-fill-color')))] }))
    }}>Sample ink</button>
    <output style={{ display: 'block', overflowWrap: 'anywhere', maxHeight: 64, overflow: 'auto' }}>{report}</output>
  </aside>, document.body)
}
