import { bookPoses, cardPoses, monitorDepth, paperPosition, speakerScreen, speakerPosition, speakerScale, speakerViewOffset } from './motion'

export const destinations = [
  { id: 'projects', number: '01', label: 'projects', object: 'the monitor', subtitle: 'Things I have built.' },
  { id: 'about', number: '02', label: 'about me', object: 'the notebook', subtitle: 'A little context.' },
  { id: 'reading', number: '03', label: 'reading', object: 'the book stack', subtitle: 'Ideas that stay with me.' },
  { id: 'music', number: '04', label: 'listening', object: 'the speaker', subtitle: 'What I’m listening to.' },
  { id: 'writing', number: '05', label: 'writing', object: 'the loose pages', subtitle: 'Notes from building things.' },
  { id: 'contact', number: '06', label: 'say hello', object: 'the desk ID', subtitle: 'The start of a conversation.' },
] as const

// Only placed objects appear in the dock. The legacy Writing route remains
// addressable, while its pile is absent from the desk overview.
export const deskDestinations = destinations.filter(item => item.id !== 'writing')

export type Destination = typeof destinations[number]['id']
export type AboutSection = 'intro' | 'experience' | 'education'
export type Point = [number, number, number]

export const deskHeight = (standing: boolean) => standing ? 3.1 : 2.35

// Dimensions include a little of the object's frame. The camera and HTML surface
// share this fit, so text resolves to normal CSS pixels after the camera settles.
export function focusView(id: Destination, width: number, height: number) {
  const mobile = width < 768
  const shortViewport = height < 550
  const book = id === 'about' || id === 'reading'
  const bookX = -.65
  const views: Record<Destination, { target: Point; offset: Point; width: number; height: number }> = {
    projects: mobile
      ? { target: [.2, 1.57, monitorDepth + .01], offset: [0, 0, 9], width: 1.6, height: 2.02 }
      : { target: [.2, 1.57, monitorDepth + .01], offset: [0, 0, 9], width: 4.55, height: 2.02 },
    about: { target: [bookPoses.about.open[0] + bookX, bookPoses.about.open[1] + .11, bookPoses.about.open[2]], offset: [0, 9, .001], width: mobile ? 2.72 : 2.8, height: 1.77 },
    reading: { target: [bookPoses.reading.open[0] + bookX, bookPoses.reading.open[1] + .11, bookPoses.reading.open[2]], offset: [0, 9, .001], width: mobile ? 2.72 : 2.8, height: 1.77 },
    music: { target: [speakerPosition[0], speakerPosition[1] - .1 * speakerScale, speakerPosition[2] + speakerScreen[2] * speakerScale], offset: speakerViewOffset, width: 1.32, height: 1.22 },
    writing: { target: [paperPosition[0], paperPosition[1] + .56, paperPosition[2]], offset: [0, 9, .001], width: 1.35, height: 1.8 },
    contact: { target: cardPoses.open, offset: [0, 0, 9], width: 1.36, height: 1.94 },
  }
  const view = views[id]
  const availableWidth = Math.max(240, width - (mobile ? book ? 16 : 32 : 180))
  // Match the compact header, toolbar and dock in desk.css on short screens.
  const availableHeight = shortViewport ? Math.max(80, height - 108 - 80) : Math.max(mobile && book ? 120 : 200, height - (mobile ? book ? 280 : 276 : 260))
  return { ...view, shift: shortViewport ? (80 - 108) / 2 : mobile ? book ? 2 : 15 : 6, zoom: Math.min(availableWidth / view.width, availableHeight / view.height), mobile }
}

export function readLocation(): { destination: Destination | null; about: AboutSection; companion?: boolean } {
  const [name, section] = window.location.hash.replace('#', '').split('/')
  return {
    destination: destinations.some(item => item.id === name) ? name as Destination : null,
    about: section === 'experience' || section === 'education' ? section : 'intro',
    companion: name === 'ask',
  }
}

export function overviewView(width: number, height: number) {
  const mobile = width < 768
  return {
    zoom: .92 * Math.min(width / (mobile ? height < 540 ? 18.5 : 14.3 : 15.4), (height - (mobile ? 210 : 100)) / 9.3),
    shift: mobile && height < 700 ? 24 : 0,
  }
}

export function overviewPose(width: number, height: number, orbit: { x: number; y: number; zoom?: number }, standing: boolean, fittedZoom?: number) {
  const view = overviewView(width, height), zoom = (fittedZoom ?? view.zoom) * (orbit.zoom ?? 1)
  const angle = .43 + orbit.x, elevation = Math.sin(.53 + orbit.y)
  const vertical = elevation / Math.hypot(1, elevation), up = 1 / Math.hypot(1, elevation)
  const shift = view.shift / zoom
  const target: Point = [-.1 - Math.sin(angle) * vertical * shift, deskHeight(standing) * .65 + .55 + up * shift, .15 - Math.cos(angle) * vertical * shift]
  return {
    zoom, target,
    position: [target[0] + Math.sin(angle) * 13, target[1] + elevation * 13, target[2] + Math.cos(angle) * 13] as Point,
  }
}
