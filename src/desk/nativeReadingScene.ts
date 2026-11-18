import { nativePaperLayout } from './nativePaperLayout'
import { focusView } from './model'

export type NativeReadingFrame = {
  pixels: ImageData; width: number; height: number; captureMs: number;
}

export const nativeReadingApproachMs = 650

// An orthographic, top-down frame can be resized around the paper's anchor.
// This retains the desk and paper stack through Safari toolbar/rotation changes.
export function nativeReadingImageLayout(frame: Pick<NativeReadingFrame, 'width' | 'height'>, width: number, height: number) {
  const before = focusView('writing', frame.width, frame.height), after = nativePaperLayout(width, height)
  const scale = focusView('writing', width, height).zoom / before.zoom
  const left = (frame.width - 1.15 * before.zoom) / 2
  const top = (frame.height - 1.6 * before.zoom) / 2 - before.shift
  return { left: after.left - left * scale, top: after.top - top * scale, width: frame.width * scale, height: frame.height * scale }
}
