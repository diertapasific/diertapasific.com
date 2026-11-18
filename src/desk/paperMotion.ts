// The moving sheet must have exactly the resting page's outline. The binding
// gap belongs to the hinge, not the sheet: including it makes the page expand
// sideways as soon as the HTML surface hands off to WebGL.
export const bookPage = { width: 1.24, height: 1.58, rightX: .015, leftX: -1.3, rightY: .094, leftY: .120 }
export const bookSpineX = (bookPage.rightX + bookPage.leftX) / 2
export const paperSize = { width: bookPage.width, height: bookPage.height }
export const paperGutter = bookPage.rightX - bookPage.width / 2 - bookSpineX
export const paperReach = paperGutter + paperSize.width
export const paperElevation = (progress: number) => bookPage.rightY + (bookPage.leftY - bookPage.rightY) * progress

export function samplePaper(progress: number, distance: number, z: number, point: { x: number; y: number; z: number; shade: number }) {
  const p = Math.max(0, Math.min(1, progress + .08 * Math.sin(Math.PI * progress) * z / paperSize.height))
  const curl = 1.6 * Math.sin(Math.PI * p), base = Math.PI * p - curl / 2, curvature = curl / paperReach
  const halfArc = curvature * distance / 2
  // This form also stays stable at takeoff, where subtracting almost equal
  // cosines before dividing by a tiny curvature can make the edge shimmer.
  const chord = distance * (halfArc === 0 ? 1 : Math.sin(halfArc) / halfArc)
  point.x = chord * Math.cos(base + halfArc)
  point.y = chord * Math.sin(base + halfArc)
  point.z = z
  point.shade = 1 - .12 * Math.sin(base + 2 * halfArc) ** 2
}

export function createPaperSurface(forward: boolean, columns = 48, rows = 16) {
  const count = (columns + 1) * (rows + 1)
  const surface = { columns, rows, positions: new Float32Array(count * 3), colors: new Float32Array(count * 3), point: { x: 0, y: 0, z: 0, shade: 1 } }
  updatePaperSurface(surface, forward ? 0 : 1)
  return surface
}

export function updatePaperSurface(surface: ReturnType<typeof createPaperSurface>, progress: number) {
  const { columns, rows, positions, colors, point } = surface
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const offset = (row * (columns + 1) + col) * 3
    samplePaper(progress, paperGutter + col / columns * paperSize.width, (row / rows - .5) * paperSize.height, point)
    positions[offset] = point.x; positions[offset + 1] = point.y; positions[offset + 2] = point.z
    colors[offset] = colors[offset + 1] = colors[offset + 2] = point.shade
  }
}
