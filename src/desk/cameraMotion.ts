import { Matrix4, Quaternion } from 'three'
import type { OrthographicCamera, Vector3 } from 'three'

export const createCameraMotion = () => ({ basis: new Matrix4(), rotation: new Quaternion() })

// Blend the desired orientation directly. Looking at a separately damped target
// becomes unstable near a top-down view, where tiny residual X/Z offsets add roll.
export function advanceCameraMotion(camera: OrthographicCamera, motion: ReturnType<typeof createCameraMotion>, position: Vector3, target: Vector3, up: Vector3, zoom: number, delta: number, immediate = false) {
  motion.basis.lookAt(position, target, up)
  motion.rotation.setFromRotationMatrix(motion.basis)
  // Camera travel follows elapsed time even when a phone misses render frames.
  const blend = immediate ? 1 : 1 - Math.exp(-7.5 * (Number.isFinite(delta) ? Math.max(0, delta) : 0))
  camera.position.lerp(position, blend)
  camera.quaternion.slerp(motion.rotation, blend)
  camera.zoom += (zoom - camera.zoom) * blend
  if (camera.position.distanceToSquared(position) < 1e-8 && camera.quaternion.angleTo(motion.rotation) < 1e-5 && Math.abs(camera.zoom - zoom) < .001) {
    camera.position.copy(position); camera.quaternion.copy(motion.rotation); camera.zoom = zoom
  }
  camera.updateProjectionMatrix()
}
