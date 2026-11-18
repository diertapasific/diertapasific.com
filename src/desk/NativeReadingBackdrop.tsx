'use client'

import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { nativeReadingImageLayout } from './nativeReadingScene'
import type { NativeReadingFrame } from './nativeReadingScene'

export function NativeReadingBackdrop({ frame, surface }: { frame: NativeReadingFrame; surface: RefObject<HTMLDivElement> }) {
  const [size, setSize] = useState({ width: frame.width, height: frame.height })
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
  return <img data-reading-backdrop src={frame.image} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute max-w-none" style={nativeReadingImageLayout(frame, size.width, size.height)} />
}
