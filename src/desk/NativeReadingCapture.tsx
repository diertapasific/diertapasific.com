'use client'

import { useLayoutEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber'
import type { OrthographicCamera } from 'three'
import type { DeskMotion } from './motion'
import { landReadingCamera } from './readingCamera'
import { nativeReadingApproachMs } from './nativeReadingScene'
import type { NativeReadingFrame } from './nativeReadingScene'

export function NativeReadingCapture({ motion, standing, onCapture, onFailure }: {
  motion: MutableRefObject<DeskMotion>; standing: boolean; onCapture: (frame: NativeReadingFrame) => void; onFailure: () => void;
}) {
  const { gl, camera, size } = useThree()
  const started = useRef<number | null>(null), landed = useRef(false)
  const timeoutCheck = import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene-checks') === 'timeout'
  useFrame(() => {
    if (timeoutCheck || motion.current.id !== 'writing') { started.current = null; return }
    started.current ??= performance.now()
    if (performance.now() - started.current >= nativeReadingApproachMs) {
      motion.current.progress = 1; landed.current = true
    }
  }, -1)
  useFrame(() => {
    // Finish the last subpixel of the approach at a bounded time. Waiting for
    // exact convergence made slow phones sit on the cover for several seconds.
    if (landed.current) landReadingCamera(camera as OrthographicCamera, size.width, size.height, standing)
  })
  useLayoutEffect(() => {
    if (timeoutCheck) return
    let captured = false
    const stop = addAfterEffect(() => {
      if (captured || !landed.current || gl.getContext().isContextLost()) return
      captured = true
      try {
        const copy = document.createElement('canvas')
        copy.width = gl.domElement.width; copy.height = gl.domElement.height
        const context = copy.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('The paper background could not be copied')
        context.drawImage(gl.domElement, 0, 0)
        const pixels = context.getImageData(0, 0, copy.width, copy.height)
        copy.width = 0; copy.height = 0
        const frame: NativeReadingFrame = { pixels, width: size.width, height: size.height, captureMs: performance.now() - started.current! }
        // The old renderer is disposed while reading. Returning creates a fresh
        // renderer; the normal Canvas unmount handles resource disposal.
        onCapture(frame)
      } catch { onFailure() }
    })
    return stop
  }, [gl, size.width, size.height, onCapture, onFailure, timeoutCheck])
  return null
}
