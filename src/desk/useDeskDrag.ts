'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { listenForDeskGestures, scaleDeskZoom } from './deskGestures'
import type { DeskOrbit } from './deskGestures'

export function useDeskDrag(surface: RefObject<HTMLDivElement>, enabled: boolean, reset: number, zoomStep = 0) {
  const orbit = useRef<DeskOrbit>({ x: 0, y: 0, zoom: 1 }), suppressClickUntil = useRef(0), previousStep = useRef(zoomStep)
  useEffect(() => { orbit.current = { x: 0, y: 0, zoom: 1 } }, [reset])
  useEffect(() => {
    const step = zoomStep - previousStep.current
    previousStep.current = zoomStep
    if (enabled && step) orbit.current.zoom = scaleDeskZoom(orbit.current.zoom, Math.exp(step * .16))
  }, [zoomStep, enabled])
  useEffect(() => {
    const root = surface.current
    if (root && enabled) return listenForDeskGestures(root, window, orbit, suppressClickUntil)
  }, [surface, enabled])
  return { orbit, suppressClickUntil }
}
