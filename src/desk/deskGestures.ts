export type DeskOrbit = { x: number; y: number; zoom: number }
export const deskZoomRange = { min: .8, max: 1.6 }
export const clampDeskZoom = (value: number) => Math.min(deskZoomRange.max, Math.max(deskZoomRange.min, Number.isFinite(value) ? value : 1))
export const scaleDeskZoom = (value: number, factor: number) => clampDeskZoom(value * (Number.isFinite(factor) && factor > 0 ? factor : 1))

export function listenForDeskGestures(root: HTMLElement, scope: Window, orbit: { current: DeskOrbit }, suppress: { current: number }, now = () => performance.now()) {
  const points = new Map<number, { x: number; y: number; startX: number; startY: number; target: Element }>()
  let dragging = false, pinchDistance = 0, gestureZoom = 1
  const distance = () => { const [a, b] = [...points.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
  const blockClick = () => { suppress.current = now() + 350 }
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || (!event.isPrimary && event.pointerType !== 'touch') || points.size >= 2) return
    const target = event.target as Element
    if (target.closest('[data-object-surface]') || event.pointerType !== 'touch' && target.closest('[data-desk-control]')) return
    points.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, target })
    try { target.setPointerCapture(event.pointerId) } catch { /* A cancelled touch may already have ended. */ }
    if (points.size === 2) { pinchDistance = distance(); blockClick(); dragging = false; delete root.dataset.dragging }
  }
  const move = (event: PointerEvent) => {
    const point = points.get(event.pointerId)
    if (!point) return
    const dx = event.clientX - point.x, dy = event.clientY - point.y
    point.x = event.clientX; point.y = event.clientY
    if (points.size === 2) {
      const next = distance()
      if (pinchDistance > 4 && next > 4) orbit.current.zoom = scaleDeskZoom(orbit.current.zoom, next / pinchDistance)
      pinchDistance = next; blockClick(); return
    }
    if (!dragging && Math.hypot(point.x - point.startX, point.y - point.startY) < 6) return
    dragging = true; root.dataset.dragging = 'true'; blockClick()
    orbit.current.x = Math.max(-.65, Math.min(.65, orbit.current.x - dx * .0035))
    orbit.current.y = Math.max(-.23, Math.min(.3, orbit.current.y + dy * .0027))
  }
  const releasePoint = (id: number) => {
    const point = points.get(id)
    try { if (point?.target.hasPointerCapture(id)) point.target.releasePointerCapture(id) } catch { /* Capture is already released on some touch cancellations. */ }
    points.delete(id)
  }
  const up = (event: PointerEvent) => {
    if (!points.has(event.pointerId)) return
    if (dragging || points.size === 2) blockClick()
    releasePoint(event.pointerId)
    for (const point of points.values()) { point.startX = point.x; point.startY = point.y }
    dragging = false; pinchDistance = 0; delete root.dataset.dragging
  }
  const clear = () => { for (const id of points.keys()) releasePoint(id); dragging = false; pinchDistance = 0; delete root.dataset.dragging }
  const click = (event: MouseEvent) => { if (event.detail !== 0 && now() < suppress.current) { event.preventDefault(); event.stopImmediatePropagation() } }
  const wheel = (event: WheelEvent) => {
    if ((event.target as Element).closest('[data-object-surface]') || !Number.isFinite(event.deltaY) || event.deltaY === 0) return
    event.preventDefault()
    const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1)
    orbit.current.zoom = scaleDeskZoom(orbit.current.zoom, Math.exp(-Math.max(-1000, Math.min(1000, pixels)) * (event.ctrlKey ? .006 : .0015)))
    blockClick()
  }
  const key = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
    const target = event.target as HTMLElement
    if (!target || target.isContentEditable || target.closest?.('input,textarea,select')) return
    if (event.key === '+' || event.key === '=') orbit.current.zoom = scaleDeskZoom(orbit.current.zoom, 1.16)
    else if (event.key === '-') orbit.current.zoom = scaleDeskZoom(orbit.current.zoom, 1 / 1.16)
    else if (event.key === '0') Object.assign(orbit.current, { x: 0, y: 0, zoom: 1 })
    else return
    event.preventDefault()
  }
  // Safari trackpads emit gesture events instead of Ctrl+wheel. Touch pointers
  // take precedence so one pinch cannot apply its scale twice.
  const gestureStart = (event: Event) => { event.preventDefault(); gestureZoom = orbit.current.zoom }
  const gestureChange = (event: Event) => { event.preventDefault(); if (points.size < 2) { orbit.current.zoom = scaleDeskZoom(gestureZoom, (event as Event & { scale: number }).scale); blockClick() } }
  root.addEventListener('pointerdown', down, true); root.addEventListener('click', click, true)
  root.addEventListener('wheel', wheel, { passive: false })
  root.addEventListener('gesturestart', gestureStart, { passive: false }); root.addEventListener('gesturechange', gestureChange, { passive: false })
  scope.addEventListener('pointermove', move); scope.addEventListener('pointerup', up); scope.addEventListener('pointercancel', clear); scope.addEventListener('blur', clear); scope.addEventListener('keydown', key)
  return () => {
    clear(); root.removeEventListener('pointerdown', down, true); root.removeEventListener('click', click, true); root.removeEventListener('wheel', wheel)
    root.removeEventListener('gesturestart', gestureStart); root.removeEventListener('gesturechange', gestureChange)
    scope.removeEventListener('pointermove', move); scope.removeEventListener('pointerup', up); scope.removeEventListener('pointercancel', clear); scope.removeEventListener('blur', clear); scope.removeEventListener('keydown', key)
  }
}
