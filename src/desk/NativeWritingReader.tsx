'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { NativeArticleDeck } from './NativeArticleDeck'
import { nativePaperLayout, nativePaperQuery } from './nativePaperLayout'

export function useNativePaper() {
  const forceTouchCheck = import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene-checks') === 'touch'
  const [native, setNative] = useState(() => forceTouchCheck || window.matchMedia(nativePaperQuery).matches)
  useEffect(() => {
    const media = window.matchMedia(nativePaperQuery)
    const update = () => setNative(forceTouchCheck || media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [forceTouchCheck])
  return native
}

export function NativeWritingReader({ index, onSelect, dark, surface, fallback = false, revealDelay = 650, closing = false, instantClose = false }: {
  index: number; onSelect: (index: number) => void; dark: boolean; surface: RefObject<HTMLDivElement>; fallback?: boolean; revealDelay?: number; closing?: boolean; instantClose?: boolean;
}) {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [landed, setLanded] = useState(false)
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
    const timer = window.setTimeout(() => setLanded(true), revealDelay)
    return () => window.clearTimeout(timer)
  }, [revealDelay])
  const layout = nativePaperLayout(size.width, size.height)
  return createPortal(<div data-native-writing-reader data-theme={dark ? 'dark' : 'light'} data-scene-failed={fallback || undefined} className="native-writing-reader" hidden={!landed || (closing && instantClose)} style={{ ...layout, position: 'fixed', opacity: closing ? 0 : 1, pointerEvents: closing ? 'none' : undefined }}>
    <NativeArticleDeck index={index} onSelect={onSelect} dark={dark} interactive={landed && !closing} width={layout.width} height={layout.height} />
  </div>, document.body)
}
