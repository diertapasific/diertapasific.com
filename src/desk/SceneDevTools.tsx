'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useThree } from '@react-three/fiber'
import { Vector2 } from 'three'

// Explicit local fault controls, removed from the production build.
const command = 'desk-scene-check', sample = 'desk-scene-sample'
export function SceneDevProbe() {
  const { gl, get } = useThree()
  const [crash, setCrash] = useState(false)
  useEffect(() => {
    const run = (event: Event) => {
      const action = (event as CustomEvent<string>).detail
      if (action === 'sample') {
        const size = gl.getDrawingBufferSize(new Vector2())
        window.dispatchEvent(new CustomEvent(sample, { detail: { frames: gl.info.render.frame, loop: get().frameloop, dpr: gl.getPixelRatio(), size: size.toArray(), antialias: gl.getContext().getContextAttributes()?.antialias } }))
      } else if (action === 'lose-context') gl.getContext().getExtension('WEBGL_lose_context')?.loseContext()
      else if (action === 'render-error') setCrash(true)
    }
    window.addEventListener(command, run)
    return () => window.removeEventListener(command, run)
  }, [gl, get])
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
  const run = (action: string) => window.dispatchEvent(new CustomEvent(command, { detail: action }))
  return createPortal(<aside aria-label="Local scene checks" style={{ position: 'fixed', bottom: 130, left: 8, zIndex: 100, background: '#f6f6f6', color: '#333', padding: 8, fontSize: 11, maxWidth: 'calc(100% - 16px)' }}>
    <button onClick={() => run('sample')}>Sample scene</button>
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
    <output style={{ display: 'block', overflowWrap: 'anywhere' }}>{report}</output>
  </aside>, document.body)
}
