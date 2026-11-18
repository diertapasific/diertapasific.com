type SurfaceProjection = { a: number; b: number; c: number; d: number; x: number; y: number; width: number; height: number }

export function surfacePresentation({ a, b, c, d, x, y, width, height }: SurfaceProjection, nativeLayout = false) {
  const native = Math.abs(a - 1) * width < .5 && Math.abs(b) * width < .5 && Math.abs(c) * height < .5 && Math.abs(d - 1) * height < .5
  if (native) { a = d = 1; b = c = 0; x = Math.round(x); y = Math.round(y) }
  // Once landed, Safari gets an ordinary positioned scroll view with no
  // transformed ancestors. Only the travelling physical sheet needs a matrix.
  return {
    mode: native ? 'native' : 'projected',
    left: native && nativeLayout ? `${x}px` : '0px',
    top: native && nativeLayout ? `${y}px` : '0px',
    transform: native && nativeLayout ? 'none' : `matrix(${a},${b},${c},${d},${x},${y})`,
  }
}

// Keep travelling surfaces on transforms. A landed reader only uses ordinary
// positioning once its screen position has stopped changing for two frames.
export const createSurfaceTracker = () => ({ x: NaN, y: NaN, frames: 0 })
export function surfaceHasSettled(state: ReturnType<typeof createSurfaceTracker>, x: number, y: number) {
  state.frames = state.x === x && state.y === y ? Math.min(2, state.frames + 1) : 0
  state.x = x; state.y = y
  return state.frames === 2
}
