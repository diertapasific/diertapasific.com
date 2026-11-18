import { focusView } from './model'

// Match the resting paper's CSS pixel size and camera fit. The scroll view is
// ordinary layout, independent of the WebGL camera and frame callbacks.
export function nativePaperLayout(width: number, height: number) {
  const view = focusView('writing', width, height)
  const paperWidth = Math.round(1.15 * view.zoom)
  const paperHeight = Math.round(1.6 * view.zoom)
  return {
    width: paperWidth,
    height: paperHeight,
    left: Math.round((width - paperWidth) / 2),
    top: Math.round((height - paperHeight) / 2 - view.shift),
  }
}

export const nativePaperQuery = '(max-width: 767px), (hover: none) and (pointer: coarse)'
