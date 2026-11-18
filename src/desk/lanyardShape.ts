import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three'
import type { Point } from './model'

// A loose ribbon with two irregular folds. The raised return strand crosses
// over the lower one, rather than occupying the same plane at the crossover.
export const lanyardLoop: Point[] = [
  [0, .49, .026], [-.20, .58, .030], [-.62, .78, .040],
  [-.68, 1.10, .035], [-.35, 1.25, .025], [.06, 1.05, .024],
  [.39, 1.12, .026], [.49, .91, .050], [.22, .76, .078],
  [-.15, 1.15, .110], [-.43, .72, .075], [-.26, .52, .035],
]
const samples = 144, halfWidth = .033

function ribbonData() {
  const curve = new CatmullRomCurve3(lanyardLoop.map(point => new Vector3(...point)), true, 'centripetal')
  const positions: number[] = [], indices: number[] = [], edges: Point[][] = [[], []]
  const min: Point = [Infinity, Infinity, Infinity], max: Point = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, center = curve.getPoint(t), tangent = curve.getTangent(t)
    const twist = Math.sin(t * Math.PI * 6) * Math.sin(t * Math.PI) * .32
    const normal = new Vector3(-tangent.y, tangent.x, 0).normalize().applyAxisAngle(tangent, twist).multiplyScalar(halfWidth)
    for (const [side, edge] of [[-1, 0], [1, 1]]) {
      const point = center.clone().addScaledVector(normal, side)
      const position = point.toArray() as Point
      positions.push(...position); edges[edge].push(position)
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], position[axis])
        max[axis] = Math.max(max[axis], position[axis])
      }
    }
    if (i < samples) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  }
  return { positions, indices, edges, bounds: { min, max } }
}
const ribbon = ribbonData()
export const lanyardBounds = ribbon.bounds

export function createLanyardGeometry() {
  const geometry = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(ribbon.positions, 3))
  geometry.setIndex(ribbon.indices); geometry.computeBoundingSphere()
  return { geometry, edges: ribbon.edges }
}
