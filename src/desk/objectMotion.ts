export const miniatureHome: [number, number, number] = [-.84, .35, -.61]
export const miniatureRollDuration = 2.2
export const miniatureRollDistance = .48

export function miniatureRoll(elapsed: number) {
  const progress = Math.max(0, Math.min(1, elapsed / miniatureRollDuration))
  return progress === 0 || progress === 1 ? 0 : -miniatureRollDistance * Math.sin(Math.PI * progress) ** 2
}

export type IdFlip = { angle: number; velocity: number }
// Exact critically damped spring (stiffness 100, damping 20). No frame-rate
// dependent Euler integration or timers compete with the desk camera.
export function advanceIdFlip(state: IdFlip, target: number, delta: number) {
  const dt = Math.max(0, Math.min(delta, .05)), displacement = state.angle - target
  const spring = state.velocity + 10 * displacement, decay = Math.exp(-10 * dt)
  state.angle = target + (displacement + spring * dt) * decay
  state.velocity = (state.velocity - 10 * spring * dt) * decay
  const settled = Math.abs(state.angle - target) < .0005 && Math.abs(state.velocity) < .005
  if (settled) { state.angle = target; state.velocity = 0 }
  return settled
}

// Keep the ID in front of the desktop while its wide edge turns sideways.
// This only adds clearance during an interrupted flip; the parked poses stay put.
export function idCardZ(z: number, scale: number, progress: number, angle: number, deskFront: number) {
  const yaw = -.14 * (1 - progress), roll = .098 * (1 - progress)
  const depth = scale * (.30 * Math.abs(Math.sin(angle + yaw)) + .025 * Math.abs(Math.cos(angle + yaw))
    + .50 * Math.abs(Math.sin(yaw) * Math.sin(roll)) + .30 * (1 - Math.cos(roll)))
  return Math.max(z, deskFront + depth + .015)
}


export const idRevealDuration = .82
export type IdReveal = IdFlip & { hinted: boolean; hintElapsed: number }
export const createIdReveal = (): IdReveal => ({ angle: 0, velocity: 0, hinted: false, hintElapsed: idRevealDuration })

// A single partial turn hints at the reverse after the camera arrives. Driving
// the existing spring preserves angle and velocity when a click interrupts it.
export function advanceIdReveal(state: IdReveal, input: { selected: boolean; active: boolean; back: boolean; turning: boolean; reducedMotion: boolean }, delta: number) {
  const { selected, active, back, turning, reducedMotion } = input
  const dt = Math.max(0, Math.min(delta, .05))
  if (!selected) { state.hinted = false; state.hintElapsed = idRevealDuration }
  else if (active && !state.hinted) { state.hinted = true; state.hintElapsed = 0 }
  if (!selected || !active || back || turning || reducedMotion) state.hintElapsed = idRevealDuration
  const hint = state.hintElapsed < idRevealDuration ? -.42 * Math.sin(Math.PI * state.hintElapsed / idRevealDuration) ** 2 : 0
  state.hintElapsed = Math.min(idRevealDuration, state.hintElapsed + dt)
  const target = selected && back ? -Math.PI : hint
  if (reducedMotion) { state.angle = target; state.velocity = 0; return true }
  return advanceIdFlip(state, target, dt)
}
