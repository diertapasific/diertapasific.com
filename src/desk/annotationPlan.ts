import { OrthographicCamera, Vector3 } from 'three'
import { overviewPose, overviewView } from './model'
import { annotationObjects, annotationObstacles } from './annotationGeometry'
import { layoutAttachedAnnotations } from './annotationLayout'
import type { AnnotationFrame, ScreenPoint, ScreenRect } from './annotationLayout'

export type AnnotationPlan = { width: number; height: number; zoom: number; offsets: ScreenPoint[] }

// Preflight the entire orbit once per viewport. Each card then follows its own
// object with a continuous projection instead of repacking during camera motion.
export function createAnnotationPlan(width: number, height: number, area: ScreenRect, chrome: ScreenRect[], deskHeight: number): AnnotationPlan | null {
  const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, 100)
  const point = new Vector3()
  const anchors = annotationObjects.map(item => new Vector3(item.anchor[0], item.anchor[1] + deskHeight, item.anchor[2]))
  const boxes = annotationObstacles.map(({ center, size }) => {
    const corners: Vector3[] = []
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      corners.push(new Vector3(center[0] + x * size[0] / 2, center[1] + deskHeight + y * size[1] / 2, center[2] + z * size[2] / 2))
    }
    return corners
  })
  const project = (world: Vector3) => {
    point.copy(world).project(camera)
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 }
  }
  const frame = (x: number, y: number, zoom: number): AnnotationFrame => {
    const pose = overviewPose(width, height, { x, y }, deskHeight > 2.5, zoom)
    camera.position.set(...pose.position); camera.lookAt(...pose.target)
    camera.zoom = zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld()
    return {
      anchors: anchors.map(project),
      obstacles: boxes.map(corners => {
        const rect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
        for (const corner of corners) {
          const p = project(corner)
          // Cover the curved envelope between sampled angles as well.
          rect.left = Math.min(rect.left, p.x - 3); rect.right = Math.max(rect.right, p.x + 3)
          rect.top = Math.min(rect.top, p.y - 3); rect.bottom = Math.max(rect.bottom, p.y + 3)
        }
        return rect
      }),
    }
  }
  const baseZoom = overviewView(width, height).zoom
  for (let step = 0; step <= 24; step++) {
    const zoom = baseZoom * (1 - step * .025), frames = [frame(0, 0, zoom)]
    for (let x = 0; x <= 12; x++) for (let y = 0; y <= 8; y++) frames.push(frame(-.65 + x * 1.3 / 12, -.23 + y * .53 / 8, zoom))
    const offsets = layoutAttachedAnnotations(frames, chrome, area)
    if (offsets.length === annotationObjects.length) return { width, height, zoom, offsets }
  }
  return null
}
