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

// Live 3D papers are the default on every screen. Keep the native Safari
// workaround available explicitly while the original mechanism is re-tested.
export function nativeWritingRequested(search: string) {
  const params = new URLSearchParams(search)
  return params.get('paper') === 'native' || params.get('camera') === 'parked'
}

// The paper must outlive the scene, including on devices normally using the
// projected desktop reader. Graphics recovery cannot remove article content.
export function writingReaderAvailable(section: string | null, native: boolean, failed: boolean) {
  return section === 'writing' && (native || failed)
}
