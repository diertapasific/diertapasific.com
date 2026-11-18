'use client'

import { memo, useLayoutEffect, useRef } from 'react'
import type { ReadingBookId } from './books'

// Original monochrome diagrams, shared by the physical cover and open page.
export function drawReadingArtwork(c: CanvasRenderingContext2D, id: ReadingBookId, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / 400, height / 160)
  c.save(); c.translate(x + (width - 400 * scale) / 2, y + (height - 160 * scale) / 2); c.scale(scale, scale)
  c.strokeStyle = '#666666'; c.fillStyle = '#424242'; c.lineWidth = 1.4
  if (id === 'atomic-habits') {
    for (let i = 0; i < 13; i++) {
      const h = 9 + (i / 12) ** 1.7 * 118, bx = 10 + i * 29
      c.strokeRect(bx, 145 - h, 14, h)
      if (i % 3 === 0) c.fillRect(bx + 4, 145 - h + 4, 6, Math.max(2, h - 8))
    }
    c.beginPath(); c.moveTo(0, 151); c.lineTo(400, 151); c.stroke()
  } else if (id === 'psychology-of-money') {
    for (const [cx, cy, radius] of [[125, 80, 66], [200, 80, 66], [275, 80, 66]]) {
      c.beginPath(); c.ellipse(cx, cy, radius, radius, 0, 0, Math.PI * 2); c.stroke()
      c.beginPath(); c.moveTo(cx - 6, cy); c.lineTo(cx + 6, cy); c.moveTo(cx, cy - 6); c.lineTo(cx, cy + 6); c.stroke()
    }
    c.setLineDash([3, 7]); c.beginPath(); c.moveTo(25, 80); c.lineTo(375, 80); c.stroke()
  } else {
    c.setLineDash([3, 7]); c.beginPath(); c.ellipse(200, 80, 155, 69, 0, 0, Math.PI * 2); c.stroke()
    c.setLineDash([]); c.beginPath(); c.ellipse(200, 80, 63, 63, 0, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.arc(200, 80, 5, 0, Math.PI * 2); c.fill()
    for (const [px, py] of [[47, 62], [109, 139], [327, 120], [290, 24]]) {
      c.beginPath(); c.moveTo(px - 4, py - 4); c.lineTo(px + 4, py + 4); c.moveTo(px + 4, py - 4); c.lineTo(px - 4, py + 4); c.stroke()
    }
  }
  c.restore()
}

export const ReadingArtwork = memo(function ReadingArtwork({ book }: { book: ReadingBookId }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const node = canvas.current, context = node?.getContext('2d')
    if (!node || !context) return
    const draw = () => {
      node.width = Math.max(1, Math.round(node.clientWidth * 2))
      node.height = Math.max(1, Math.round(node.clientHeight * 2))
      drawReadingArtwork(context, book, 0, 0, node.width, node.height)
    }
    draw()
    const resize = new ResizeObserver(draw)
    resize.observe(node)
    return () => resize.disconnect()
  }, [book])
  return <canvas ref={canvas} width={800} height={320} className="block h-full w-full" aria-hidden="true" />
})
