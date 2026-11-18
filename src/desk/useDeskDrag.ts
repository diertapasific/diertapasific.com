'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useDeskDrag(surface: RefObject<HTMLDivElement>, enabled: boolean, reset: number) {
  const orbit = useRef({ x: 0, y: 0 })
  const suppressClickUntil = useRef(0)

  useEffect(() => { orbit.current = { x: 0, y: 0 } }, [reset])
  useEffect(() => {
    const root = surface.current
    if (!root || !enabled) return
    let pointer: number | null = null
    let startX = 0, startY = 0, previousX = 0, previousY = 0, dragging = false
    let capture: Element | null = null
    const down = (event: PointerEvent) => {
      if (pointer !== null || !event.isPrimary || event.button !== 0) return
      const target = event.target as Element
      if (target.closest('[data-object-surface], [data-desk-control]')) return
      pointer = event.pointerId; startX = previousX = event.clientX; startY = previousY = event.clientY
      dragging = false; capture = target
      // Capture on the original target: a stationary tap must still reach its label.
      capture.setPointerCapture(pointer)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return
      if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) < 6) return
      dragging = true; root.dataset.dragging = 'true'; suppressClickUntil.current = performance.now() + 350
      // Move the scene with the hand. There is no competing pointer parallax.
      orbit.current.x = Math.max(-.65, Math.min(.65, orbit.current.x - (event.clientX - previousX) * .0035))
      orbit.current.y = Math.max(-.23, Math.min(.3, orbit.current.y + (event.clientY - previousY) * .0027))
      previousX = event.clientX; previousY = event.clientY
    }
    const release = (event?: PointerEvent) => {
      if (event && event.pointerId !== pointer) return
      if (dragging) suppressClickUntil.current = performance.now() + 350
      if (pointer !== null && capture?.hasPointerCapture(pointer)) capture.releasePointerCapture(pointer)
      pointer = null; capture = null; dragging = false; delete root.dataset.dragging
    }
    const click = (event: MouseEvent) => {
      if (event.detail !== 0 && performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopImmediatePropagation() }
    }
    const blur = () => release()
    root.addEventListener('pointerdown', down, true)
    root.addEventListener('click', click, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    window.addEventListener('blur', blur)
    return () => {
      release()
      root.removeEventListener('pointerdown', down, true); root.removeEventListener('click', click, true)
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release); window.removeEventListener('blur', blur)
    }
  }, [surface, enabled])
  return { orbit, suppressClickUntil }
}
