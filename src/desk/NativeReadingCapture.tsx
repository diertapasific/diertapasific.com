'use client'

import { useLayoutEffect } from 'react'
import type { MutableRefObject } from 'react'
import { addAfterEffect, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { paperPosition } from './motion'
import { deskHeight } from './model'
import type { DeskMotion } from './motion'
import { nativePaperLayout } from './nativePaperLayout'
import type { NativeReadingFrame } from './nativeReadingScene'

export function NativeReadingCapture({ motion, standing, intentionalLoss, onCapture, onFailure }: {
  motion: MutableRefObject<DeskMotion>; standing: boolean; intentionalLoss: MutableRefObject<boolean>; onCapture: (frame: NativeReadingFrame) => void; onFailure: () => void;
}) {
  const { gl, camera, size } = useThree()
  useLayoutEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene-checks') === 'timeout') return
    let cancelled = false, pending = false
    const point = new Vector3(), layout = nativePaperLayout(size.width, size.height)
    const stop = addAfterEffect(() => {
      if (pending || motion.current.id !== 'writing' || motion.current.progress !== 1) return
      camera.updateMatrixWorld()
      // Capture only after the physical paper and guided camera match the
      // native reader to subpixel accuracy, after the frame has actually drawn.
      for (const [x, z, screenX, screenY] of [
        [-.575, -.8, layout.left, layout.top],
        [.575, .8, layout.left + layout.width, layout.top + layout.height],
      ]) {
        point.set(paperPosition[0] + x, deskHeight(standing) + .565, paperPosition[2] + z).project(camera)
        if (Math.abs((point.x + 1) * size.width / 2 - screenX) > 1 || Math.abs((1 - point.y) * size.height / 2 - screenY) > 1) return
      }
      pending = true
      let image: string
      try {
        image = gl.domElement.toDataURL('image/png')
        if (!image.startsWith('data:image/png')) throw new Error('The reading frame was empty')
      } catch { onFailure(); return }
      const frame: NativeReadingFrame = { image, width: size.width, height: size.height }
      const decoded = new Image()
      decoded.src = image
      void decoded.decode().then(() => {
        if (cancelled) return
        // A stopped animation loop alone did not fix the affected iPhone.
        // Release the context before painting the long native text scroller.
        intentionalLoss.current = true
        gl.forceContextLoss()
        onCapture(frame)
      }, () => { if (!cancelled) onFailure() })
    })
    return () => { cancelled = true; stop() }
  }, [gl, camera, size.width, size.height, motion, standing, intentionalLoss, onCapture, onFailure])
  return null
}
