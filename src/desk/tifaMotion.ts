export const tifaHome: [number, number, number] = [-4.8, .025, 2.45]
export const tifaMat: [number, number, number] = [1.9, 1.5, .025]
export const tifaFeet = [[-.145, -.32], [-.120, .23], [.145, -.32], [.120, .23]] as const

const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }
const cue = (time: number, start: number, rise: number, hold: number, fall: number) => smooth((time - start) / rise) * (1 - smooth((time - start - rise - hold) / fall))
const stepDuration = .64, stepSpacing = .74, turnAngle = .48
// One foot moves at a time. The return uses the reverse order.
const outwardOrder = [3, 2, 1, 0], returnOrder = [0, 1, 2, 3]
const stepProgress = (phase: number, start: number) => smooth((phase - start) / stepDuration)
const stepLift = (phase: number, start: number) => {
  const t = (phase - start) / stepDuration
  return t > 0 && t < 1 ? Math.sin(t * Math.PI) ** 2 : 0
}

export function tifaPose(seconds: number, still: boolean) {
  const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0), phase = time % 36
  const outward = still ? [0, 0, 0, 0] : tifaFeet.map((_, i) => stepProgress(phase, 8 + outwardOrder.indexOf(i) * stepSpacing))
  const returning = still ? [0, 0, 0, 0] : tifaFeet.map((_, i) => stepProgress(phase, 12.5 + returnOrder.indexOf(i) * stepSpacing))
  const turn = turnAngle * (outward.reduce((sum, t) => sum + t, 0) - returning.reduce((sum, t) => sum + t, 0)) / 4
  const outLift = still ? 0 : Math.max(...outwardOrder.map((_, i) => stepLift(phase, 8 + i * stepSpacing)))
  const backLift = still ? 0 : Math.max(...returnOrder.map((_, i) => stepLift(phase, 12.5 + i * stepSpacing)))
  const turning = Math.max(outLift, backLift)
  const direction = outLift - backLift
  const shoulder = direction * .055, hip = -direction * .035
  const feet = tifaFeet.map(([x, z], i) => {
    const heading = turnAngle * (outward[i] - returning[i])
    const relative = heading - turn, c = Math.cos(relative), s = Math.sin(relative)
    const lift = still ? 0 : Math.max(stepLift(phase, 8 + outwardOrder.indexOf(i) * stepSpacing), stepLift(phase, 12.5 + returnOrder.indexOf(i) * stepSpacing)) * .052
    // Counter-rotate stance feet against the torso. Their world contact stays
    // fixed until that individual paw lifts and moves to its new heading.
    return { x: c * x + s * z - x, y: lift, z: -s * x + c * z - z, yaw: relative }
  })
  const look = still ? 0 : turnAngle * cue(phase, 7.05, .65, 4.25, .65)
  return {
    x: 0, z: 0, yaw: -.18 + turn, turn, turning, shoulder, hip, feet,
    headTurn: look - turn, drop: -turning * .008,
    sniff: still ? 0 : cue(phase, 23, 1.1, 1.5, 1.1),
    breath: Math.sin(time * 1.45) * .007,
  }
}

export function tifaPetIntensity(seconds: number) {
  const age = Math.max(0, Number.isFinite(seconds) ? seconds : 4)
  return smooth(age / .18) * (1 - smooth((age - .7) / 2.5))
}
