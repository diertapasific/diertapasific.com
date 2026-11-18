/** An outside tap must start and finish outside, without becoming a drag,
 * scroll or multi-touch gesture. Only the canvas receives this behavior;
 * projected pages, body portals and the navigation keep their own events. */
export function listenForOutsideTap(canvas: HTMLCanvasElement, scope: Window, inside: (x: number, y: number) => boolean, dismiss: () => void) {
  let tap: { id: number; x: number; y: number; moved: boolean; inside: boolean } | null = null
  let outsideClick = false
  const clear = () => { tap = null; outsideClick = false }
  const down = (event: PointerEvent) => {
    clear()
    if (!event.isPrimary || event.button !== 0) return
    tap = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, inside: inside(event.clientX, event.clientY) }
  }
  const move = (event: PointerEvent) => {
    if (tap && event.pointerId === tap.id && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >= 6) tap.moved = true
  }
  const up = (event: PointerEvent) => {
    if (!tap || event.pointerId !== tap.id) return
    move(event)
    outsideClick = event.target === canvas && event.button === 0 && !tap.moved && !tap.inside && !inside(event.clientX, event.clientY)
    tap = null
  }
  const click = (event: MouseEvent) => {
    const outside = outsideClick
    clear()
    if (!outside || event.detail === 0 || event.button !== 0) return
    // Consume the tap so a closing object cannot immediately open another one.
    event.preventDefault()
    event.stopImmediatePropagation()
    dismiss()
  }
  canvas.addEventListener('pointerdown', down, { capture: true })
  canvas.addEventListener('click', click, { capture: true })
  scope.addEventListener('pointermove', move, { capture: true })
  scope.addEventListener('pointerup', up, { capture: true })
  scope.addEventListener('pointercancel', clear, { capture: true })
  scope.addEventListener('blur', clear)
  return () => {
    clear()
    canvas.removeEventListener('pointerdown', down, { capture: true })
    canvas.removeEventListener('click', click, { capture: true })
    scope.removeEventListener('pointermove', move, { capture: true })
    scope.removeEventListener('pointerup', up, { capture: true })
    scope.removeEventListener('pointercancel', clear, { capture: true })
    scope.removeEventListener('blur', clear)
  }
}
