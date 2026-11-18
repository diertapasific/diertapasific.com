'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { nativeReadingImageLayout } from './nativeReadingScene'
import type { NativeReadingFrame } from './nativeReadingScene'

export function NativeReadingBackdrop({ frame, surface }: { frame: NativeReadingFrame; surface: RefObject<HTMLDivElement> }) {
  const bitmap = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: frame.width, height: frame.height })
  useLayoutEffect(() => {
    const node = bitmap.current
    if (!node) return
    node.width = frame.pixels.width; node.height = frame.pixels.height
    node.getContext('2d', { willReadFrequently: true })?.putImageData(frame.pixels, 0, 0)
    return () => { node.width = 0; node.height = 0 }
  }, [frame])
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
  return <canvas data-reading-backdrop ref={bitmap} aria-hidden="true" className="pointer-events-none absolute max-w-none" style={nativeReadingImageLayout(frame, size.width, size.height)} />
}
