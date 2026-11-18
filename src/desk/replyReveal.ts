// Presentation pacing only: provider replies are validated in full before display.
// Work is based on elapsed time, so slower devices do not accumulate typing lag.
export function replyRevealDuration(length: number) {
  return length === 0 ? 0 : Math.min(5500, Math.max(500, length * 11))
}

export function replyRevealCount(length: number, elapsed: number) {
  const duration = replyRevealDuration(length)
  if (!duration) return 0
  return Math.min(length, Math.max(0, Math.floor(length * elapsed / duration)))
}

export const followsReply = (scrollTop: number, clientHeight: number, scrollHeight: number) => scrollHeight - scrollTop - clientHeight < 56

export type RevealClock = { now: () => number; frame: (draw: (now: number) => void) => number; cancel: (frame: number) => void }

export function revealReply(text: string, write: (text: string) => void, done: () => void, clock: RevealClock = {
  now: () => performance.now(), frame: draw => requestAnimationFrame(draw), cancel: frame => cancelAnimationFrame(frame),
}) {
  const characters = Array.from(text), started = clock.now()
  let active = true, frame = 0, previous = 0, paintedAt = started - 32
  const finish = () => {
    if (!active) return
    active = false; clock.cancel(frame); write(text); done()
  }
  const draw = (now: number) => {
    if (!active) return
    const count = replyRevealCount(characters.length, now - started)
    if (count === characters.length) { finish(); return }
    // Batch text layout to at most 30 writes/sec alongside the 3D scene.
    if (count !== previous && now - paintedAt >= 32) { write(characters.slice(0, count).join('')); previous = count; paintedAt = now }
    frame = clock.frame(draw)
  }
  write('')
  if (!characters.length) finish()
  else frame = clock.frame(draw)
  return { finish, cancel: () => { active = false; clock.cancel(frame) } }
}
