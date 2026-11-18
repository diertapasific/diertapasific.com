import { Vector3 } from 'three'
import type { OrthographicCamera } from 'three'
import { deskHeight, focusView } from './model'

export function landReadingCamera(camera: OrthographicCamera, width: number, height: number, standing: boolean) {
  const view = focusView('writing', width, height)
  const target = new Vector3(...view.target); target.y += deskHeight(standing)
  const direction = new Vector3(...view.offset).normalize(), up = new Vector3(0, 0, -1)
  target.add(up.clone().projectOnPlane(direction).normalize().multiplyScalar(-view.shift / view.zoom))
  camera.position.copy(target).add(new Vector3(...view.offset)); camera.up.copy(up); camera.lookAt(target)
  camera.zoom = view.zoom; camera.updateProjectionMatrix(); camera.updateMatrixWorld()
}

// Only the first few return frames ignore a long renderer-startup stall. Normal
// desk navigation still follows elapsed time, including on slow devices.
export function readingReturnDelta(delta: number, recovering: boolean) {
  return recovering ? Math.min(Math.max(0, delta), 1 / 30) : delta
}
