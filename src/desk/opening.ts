import type { Point } from './model'

export type OpeningMode = 'full' | 'return' | 'none'
export const openingSessionKey = 'dipa-desk-arrived-v1'
export const openingDuration = { full: 4.2, return: .9, none: 0 } as const

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const phase = (p: number, from: number, to: number) => {
  const t = clamp((p - from) / (to - from))
  return t * t * (3 - 2 * t)
}

export function initialOpeningMode(destination: unknown, seen: boolean, reducedMotion: boolean): OpeningMode {
  if (destination) return 'none'
  return seen || reducedMotion ? 'return' : 'full'
}

export type OpeningTimeline = { mode: OpeningMode; elapsed: number; progress: number }
export const createOpeningTimeline = (mode: OpeningMode): OpeningTimeline => ({ mode, elapsed: 0, progress: mode === 'none' ? 1 : 0 })

export function advanceOpening(state: OpeningTimeline, delta: number, visible = true) {
  if (!visible || state.progress === 1 || !Number.isFinite(delta)) return
  // Pause hidden tabs and absorb long compilation stalls without a camera jump.
  state.elapsed = Math.min(openingDuration[state.mode], state.elapsed + Math.min(.1, Math.max(0, delta)))
  state.progress = state.mode === 'none' ? 1 : clamp(state.elapsed / openingDuration[state.mode])
  if (1 - state.progress < .000001) state.progress = 1
}

export function openingFrame(progress: number, mode: OpeningMode) {
  const p = clamp(progress)
  if (mode !== 'full') return {
    depth: 1, trace: 1, ink: 1, paper: 1, camera: 1,
    scene: mode === 'none' ? 1 : phase(p, 0, .75),
    screen: mode === 'none' ? 1 : phase(p, .08, .85),
    copy: mode === 'none' ? 1 : phase(p, .15, .9),
    chrome: mode === 'none' ? 1 : phase(p, .15, 1),
    labels: mode === 'none' ? 1 : phase(p, .25, 1),
  }
  return {
    depth: mix(.025, 1, phase(p, .23, .76)),
    trace: phase(p, .055, .44), ink: phase(p, .02, .15), paper: phase(p, .25, .53),
    camera: phase(p, .27, .81), scene: phase(p, 0, .12),
    screen: phase(p, .8, .96), copy: phase(p, .77, .95),
    chrome: phase(p, .84, 1), labels: phase(p, .9, 1),
  }
}

type Overview = { target: Point; position: Point; zoom: number }
export function openingPose(overview: Overview, height: number, progress: number, mode: OpeningMode): Overview {
  const t = openingFrame(progress, mode).camera
  const start: Point = [-.1, height, .15]
  const target = start.map((value, i) => mix(value, overview.target[i], t)) as Point
  const yaw = mix(-.04, .43, t)
  const elevation = mix(1.43, Math.atan(Math.sin(.53)), t)
  const radius = mix(14.6, Math.hypot(13, Math.sin(.53) * 13), t)
  // Use the exact final pose at handover, including the mobile annotation fit.
  if (t === 1) return { target: [...overview.target], position: [...overview.position], zoom: overview.zoom }
  return {
    target,
    position: [target[0] + Math.sin(yaw) * Math.cos(elevation) * radius, target[1] + Math.sin(elevation) * radius, target[2] + Math.cos(yaw) * Math.cos(elevation) * radius],
    zoom: overview.zoom * mix(1.02, 1, t),
  }
}
