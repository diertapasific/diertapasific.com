export type ScreenPoint = { x: number; y: number }
export type ScreenRect = { left: number; top: number; right: number; bottom: number }
export type AnnotationFrame = { anchors: ScreenPoint[]; obstacles: ScreenRect[] }
export const annotationSize = 44
export const annotationVisualSize = 32

export function annotationRect(point: ScreenPoint, size = annotationSize): ScreenRect {
  const half = size / 2
  return { left: point.x - half, top: point.y - half, right: point.x + half, bottom: point.y + half }
}

export function intersects(a: ScreenRect, b: ScreenRect, gap = 0) {
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap
}

// Solve in each object's coordinate system. One offset remains valid throughout
// the camera sweep, so cards follow their objects without changing sides/slots.
export function layoutAttachedAnnotations(frames: AnnotationFrame[], chrome: ScreenRect[], area: ScreenRect): ScreenPoint[] {
  const anchors = frames[0].anchors, half = annotationSize / 2
  const center = anchors.reduce((sum, p) => ({ x: sum.x + p.x / anchors.length, y: sum.y + p.y / anchors.length }), { x: 0, y: 0 })
  const rankings = anchors.map((anchor, index) => {
    const bounds = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }
    const blocked = [...frames[0].obstacles, ...chrome].map((_, i) => ({ size: i < frames[0].obstacles.length ? annotationVisualSize : annotationSize, envelope: { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }, samples: [] as ScreenRect[] }))
    for (const frame of frames) {
      const origin = frame.anchors[index]
      bounds.left = Math.max(bounds.left, area.left + half + 2 - origin.x)
      bounds.right = Math.min(bounds.right, area.right - half - 2 - origin.x)
      bounds.top = Math.max(bounds.top, area.top + half + 2 - origin.y)
      bounds.bottom = Math.min(bounds.bottom, area.bottom - half - 2 - origin.y)
      for (const [i, rect] of [...frame.obstacles, ...chrome].entries()) {
        const pad = i < frame.obstacles.length ? 0 : 3
        const relative = { left: rect.left - origin.x - pad, right: rect.right - origin.x + pad, top: rect.top - origin.y - pad, bottom: rect.bottom - origin.y + pad }
        const envelope = blocked[i].envelope
        envelope.left = Math.min(envelope.left, relative.left); envelope.right = Math.max(envelope.right, relative.right)
        envelope.top = Math.min(envelope.top, relative.top); envelope.bottom = Math.max(envelope.bottom, relative.bottom)
        blocked[i].samples.push(relative)
      }
    }
    const dx = anchor.x - center.x, dy = anchor.y - center.y, length = Math.hypot(dx, dy) || 1
    const score = (p: ScreenPoint) => p.x * p.x + p.y * p.y + Math.max(0, -(p.x * dx + p.y * dy) / length) * 80
    const candidates: { point: ScreenPoint; score: number }[] = []
    for (let y = bounds.top; y <= bounds.bottom; y += 6) for (let x = bounds.left; x <= bounds.right; x += 6) {
      const point = { x, y }
      if (!blocked.some(group => intersects(annotationRect(point, group.size), group.envelope, 5) && group.samples.some(rect => intersects(annotationRect(point, group.size), rect, 5)))) candidates.push({ point, score: score(point) })
    }
    return candidates.sort((a, b) => a.score - b.score).map(item => item.point)
  })
  const orders = [anchors.map((_, i) => i), anchors.map((_, i) => i).reverse(), [3, 0, 2, 1, 4, 5], [0, 3, 1, 2, 5, 4]]
  for (const order of orders) {
    const placed: ScreenPoint[] = []
    for (const index of order.filter(index => index < anchors.length)) {
      const next = rankings[index].find(offset => placed.every((other, j) => !other || frames.every(frame => {
        const a = annotationRect({ x: frame.anchors[index].x + offset.x, y: frame.anchors[index].y + offset.y })
        const b = annotationRect({ x: frame.anchors[j].x + other.x, y: frame.anchors[j].y + other.y })
        return !intersects(a, b, 6)
      })))
      if (!next) break
      placed[index] = next
    }
    if (placed.filter(Boolean).length === anchors.length) return placed
  }
  return []
}
