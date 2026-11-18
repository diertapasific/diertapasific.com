export type PaperDeck = { index: number; requested: number; from: number | null; progress: number }
export const createPaperDeck = (): PaperDeck => ({ index: 0, requested: 0, from: null, progress: 1 })
export function advancePaperDeck(deck: PaperDeck, delta: number, reduced: boolean) {
  if (reduced) { deck.index = deck.requested; deck.from = null; deck.progress = 1; return }
  if (deck.from === null && deck.index !== deck.requested) {
    deck.from = deck.index; deck.index = deck.requested; deck.progress = 0
  }
  if (deck.from !== null) {
    deck.progress = Math.min(1, deck.progress + (Number.isFinite(delta) ? Math.min(Math.max(delta, 0), 1) : 0) / .95)
    if (deck.progress === 1) deck.from = null
  }
}

const phase = (p: number, from: number, to: number) => {
  const t = Math.min(1, Math.max(0, (p - from) / (to - from)))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export const articleStackPose = (rank: number) => ({ height: .12 + rank * .0225, yaw: (rank - 4) * .012 })
export const articleDisplayHeight = (open: number) => .2325 + (.55 - .2325) * open

// The outgoing sheet clears the incoming sheet before lowering, then slips
// back beneath it. Background sheets keep their slots throughout the swap.
export function articleTurnPose(progress: number) {
  return {
    x: -1.42 * (phase(progress, 0, .28) - phase(progress, .52, .82)),
    height: .55 + .15 * phase(progress, 0, .25) - .25 * phase(progress, .28, .48) - .24 * phase(progress, .82, 1),
    bend: .07 * Math.sin(Math.PI * phase(progress, 0, .48)),
    incomingHeight: .21 + .34 * phase(progress, .28, .50),
  }
}
