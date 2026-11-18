'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ArticlePage } from './ArticlePage'
import { nativePaperLayout, nativePaperQuery } from './nativePaperLayout'

export function useNativePaper() {
  const [native, setNative] = useState(() => window.matchMedia(nativePaperQuery).matches)
  useEffect(() => {
    const media = window.matchMedia(nativePaperQuery)
    const update = () => setNative(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return native
}

export function NativeWritingReader({ index, onSelect, dark, surface }: {
  index: number; onSelect: (index: number) => void; dark: boolean; surface: RefObject<HTMLDivElement>;
}) {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [landed, setLanded] = useState(false)
  const page = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = surface.current
    if (!node) return
    const measure = () => {
      const { width, height } = node.getBoundingClientRect()
      setSize(previous => previous.width === width && previous.height === height ? previous : { width, height })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [surface])
  useEffect(() => {
    // Reveal after the camera's initial approach. Text and controls never wait
    // for WebGL motion progress, which Safari can throttle while scrolling.
    const timer = window.setTimeout(() => setLanded(true), 650)
    return () => window.clearTimeout(timer)
  }, [])
  const layout = nativePaperLayout(size.width, size.height)
  return createPortal(<div data-native-writing-reader className="native-writing-reader" hidden={!landed} style={{ ...layout, position: 'fixed' }}>
    <ArticlePage key={index} index={index} onSelect={onSelect} dark={dark} interactive={landed} elementRef={page} width={layout.width} height={layout.height} />
  </div>, document.body)
}
