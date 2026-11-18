import type { Destination, Point } from './model'

export const bookPoses: Record<'about' | 'reading', { rest: Point; open: Point }> = {
  about: { rest: [-3.9, .16, 1.5], open: [-2.7, .49, 1.35] },
  reading: { rest: [4.05, .41, -1.55], open: [4.45, .62, -1.55] },
}
export const deskSize: Point = [10.4, .16, 5.4]
// Dimension guides sit in front of the floor mat and on the far side of Tifa.
export const deskDimensionLines = { widthZ: deskSize[2] / 2 + 1, heightX: deskSize[0] / 2 + .4, heightZ: deskSize[2] / 2 - .3 }
// One centerline for the screen, shelf, keyboard, and mat.
export const workstationCenterX = 0
export const monitorDepth = -1.3
export const paperPosition: Point = [4.05, 0, 1.55]
export const keyboardPosition: Point = [workstationCenterX, .19, 1.18]
export const deskmatPosition: Point = [workstationCenterX, .098, keyboardPosition[2]]
export const speakerScale = .72
export const speakerPosition: Point = [-4, .804, -1.65]
export const speakerViewOffset: Point = [0, 2.1, 9]
export const mouseScale = .74
export const mousePosition: Point = [workstationCenterX + 1.65, .12, keyboardPosition[2]]
export const speakerScreen: Point = [0, .15, .393]
export const deskControlPosition: Point = [-4, -.15, 2.72]
export const cardPoses = { rest: [3.65, -.57, 2.80] as Point, open: [3.65, .5, 3.4] as Point }

export type DeskMotion = { id: Destination | null; progress: number }
export const createDeskMotion = (): DeskMotion => ({ id: null, progress: 0 })

// One physical object owns the open space at a time. Requests can change at any
// point: reverse the current path, return fully, then open the latest selection.
export function advanceDeskMotion(state: DeskMotion, requested: Destination | null, delta: number, reducedMotion: boolean) {
  if (reducedMotion) { state.id = requested; state.progress = requested ? 1 : 0; return }
  // Exponential easing stays stable across long frames. Capping at 50ms
  // made Safari need dozens of slow frames just to release a focused object.
  const elapsed = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 1) : 0
  const blend = 1 - Math.exp(-7 * elapsed)
  if (state.id !== requested) {
    // These screens are fixed in their housings; nothing has to fold away.
    state.progress = state.id === 'projects' || state.id === 'music' ? 0 : state.progress * (1 - blend)
    if (state.progress > .001) return
    state.progress = 0
    state.id = requested
  }
  if (state.id) {
    state.progress += (1 - state.progress) * blend
    if (state.progress > .999) state.progress = 1
  }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const phase = (p: number, start: number, end: number) => {
  const t = Math.min(1, Math.max(0, (p - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
export const motionProgress = (state: DeskMotion, id: Destination) => state.id === id ? state.progress : 0

export function bookPose(id: 'about' | 'reading', progress: number) {
  const { rest, open } = bookPoses[id]
  const move = phase(progress, 0, .4)
  return {
    position: rest.map((v, i) => mix(v, open[i], move)) as Point,
    yaw: (id === 'about' ? -.13 : .08) * (1 - move),
    // The closed book travels first; closing follows this same path in reverse.
    cover: Math.PI * phase(progress, .4, .96),
  }
}

export function paperPose(progress: number) {
  return { height: mix(.12, .55, progress), yaw: -.13 * (1 - progress) }
}

export function cardPose(progress: number) {
  return { position: cardPoses.rest.map((v, i) => mix(v, cardPoses.open[i], progress)) as Point, scale: mix(1, 1.8, progress) }
}

export const contentIsReady = (state: DeskMotion, requested: Destination | null) => state.id !== null && state.id === requested && state.progress >= .97
