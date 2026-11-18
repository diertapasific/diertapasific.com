import { bookPoses, cardPoses, deskmatPosition, keyboardPosition, monitorDepth, mousePosition, paperPosition, speakerPosition } from './motion'
import type { Destination, Point } from './model'

type AnnotationObject = { id: Destination; anchor: Point; center: Point; size: Point }
export const annotationObjects: AnnotationObject[] = [
  { id: 'projects', anchor: [.2, 2.53, monitorDepth], center: [.2, 1.57, monitorDepth], size: [4.4, 1.92, .12] },
  { id: 'about', anchor: [bookPoses.about.rest[0], .28, bookPoses.about.rest[2]], center: [bookPoses.about.rest[0], .22, bookPoses.about.rest[2]], size: [1.55, .25, 1.85] },
  { id: 'reading', anchor: [bookPoses.reading.rest[0], .56, bookPoses.reading.rest[2]], center: [bookPoses.reading.rest[0], .29, bookPoses.reading.rest[2]], size: [1.55, .56, 1.85] },
  { id: 'music', anchor: [speakerPosition[0], 1.25, speakerPosition[2]], center: [speakerPosition[0], .67, speakerPosition[2]], size: [1.15, 1.15, .55] },
  { id: 'writing', anchor: [paperPosition[0], .25, paperPosition[2]], center: [paperPosition[0], .16, paperPosition[2]], size: [1.65, .26, 1.85] },
  { id: 'contact', anchor: [cardPoses.rest[0], cardPoses.rest[1], cardPoses.rest[2] + .08], center: cardPoses.rest, size: [.76, 1.08, .16] },
]

export const annotationObstacles: { center: Point; size: Point }[] = [
  ...annotationObjects,
  { center: deskmatPosition, size: [4.7, .02, 1.82] },
  { center: keyboardPosition, size: [2.2, .14, 1.05] },
  { center: [mousePosition[0], mousePosition[1] + .15, mousePosition[2]], size: [.64, .4, .9] },
  { center: [.2, .2, monitorDepth + .07], size: [4.4, .4, 1.12] },
  { center: [-.84, .48, monitorDepth + .39], size: [1.1, .3, .55] },
  { center: [.98, .48, monitorDepth + .24], size: [.84, .3, .8] },
]
