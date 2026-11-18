import { cardPoses, deskSize } from './motion'
import type { Point } from './model'
import { lanyardBounds } from './lanyardShape'
export { lanyardLoop } from './lanyardShape'

export const tableBadgeRest: Point = [4.05, .116, 1.55]
export const tableBadgeRestScale = .8
export const tableBadgeFocusScale = 1.8
export const tableBadgeRoll = -.16

const ease = (p: number) => { const t = Math.max(0, Math.min(1, p)); return t*t*(3-2*t) }
const mix = (a: number, b: number, t: number) => a+(b-a)*t

// Lift and clear the front edge first; only then turn the badge upright.
// The reverse path lays the same badge and lanyard back on the desktop.
export function tableBadgePose(progress: number) {
  const lift = ease(progress/.42), upright = ease((progress-.42)/.58)
  return {
    position: [mix(tableBadgeRest[0],cardPoses.open[0],lift),mix(tableBadgeRest[1],.98,lift)-.48*upright,mix(tableBadgeRest[2],cardPoses.open[2],lift)] as Point,
    scale: mix(tableBadgeRestScale,tableBadgeFocusScale,lift),
    pitch: -Math.PI/2*(1-upright),
    roll: tableBadgeRoll*(1-upright),
  }
}

// During an interrupted flip, keep the badge above the surface until its wide
// edge has cleared the table. The final upright focus position stays unchanged.
export function tableBadgeClearanceY(pose: ReturnType<typeof tableBadgePose>, angle: number) {
  const cx = Math.cos(pose.pitch), sx = Math.sin(pose.pitch), cz = Math.cos(pose.roll), sz = Math.sin(pose.roll)
  const ca = Math.cos(angle), sa = Math.sin(angle), scale = pose.scale, front = deskSize[2] / 2
  // Rows of the shared card + lanyard rotation; no per-frame matrix allocations.
  const yy = cx * cz, yx = cx * sz * ca + sx * sa, yz = cx * sz * sa - sx * ca
  const zy = sx * cz, zx = sx * sz * ca - cx * sa, zz = sx * sz * sa + cx * ca
  const depth = .30 * Math.abs(zx) + .46 * Math.abs(zy) + .026 * Math.abs(zz)
  const down = .30 * Math.abs(yx) + .46 * Math.abs(yy) + .026 * Math.abs(yz)
  let y = pose.position[1]
  if (pose.position[2] - depth * scale < front) y = Math.max(y, deskSize[1] / 2 + down * scale + .015)

  const { min, max } = lanyardBounds
  const ribbonMinZ = (zx < 0 ? max[0] : min[0]) * zx + (zy < 0 ? max[1] : min[1]) * zy + (zz < 0 ? max[2] : min[2]) * zz
  if (pose.position[2] + ribbonMinZ * scale < front) {
    const ribbonMinY = (yx < 0 ? max[0] : min[0]) * yx + (yy < 0 ? max[1] : min[1]) * yy + (yz < 0 ? max[2] : min[2]) * yz
    y = Math.max(y, deskSize[1] / 2 - ribbonMinY * scale + .015)
  }
  return y
}
