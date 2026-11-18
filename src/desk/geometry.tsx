'use client'

import { memo, useEffect, useMemo } from 'react'
import { Edges, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Point } from './model'
import { getReadingBook } from './books'
import type { ReadingBookId } from './books'
import { keyboardPosition } from './motion'
import { drawReadingArtwork } from './ReadingArtwork'

export const PAPER = '#f6f6f6'
export const INK = '#424242'

export function Block({ size, position = [0, 0, 0], rotation = [0, 0, 0], color = PAPER, ink = INK }: { size: Point; position?: Point; rotation?: Point; color?: string; ink?: string }) {
  return <mesh position={position} rotation={rotation}><boxGeometry args={size} /><meshBasicMaterial color={color} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} /><Edges threshold={25} color={ink} /></mesh>
}

export function Stroke({ points, color = INK, dashed = false, width = 1 }: { points: Point[]; color?: string; dashed?: boolean; width?: number }) {
  return <Line points={points} color={color} lineWidth={width} dashed={dashed} dashSize={.06} gapSize={.045} />
}

export function roundedPath(w: number, h: number, radius: number) {
  const x = -w / 2, y = -h / 2, r = Math.min(radius, w / 2, h / 2)
  const path = new THREE.Shape()
  path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r)
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y)
  return path
}

// Rounded outlines with solid, hidden-line faces. The shape lies in local XY.
export function Plate({ size, radius = .05, position = [0, 0, 0], rotation = [0, 0, 0], color = PAPER, ink = INK }: { size: Point; radius?: number; position?: Point; rotation?: Point; color?: string; ink?: string }) {
  const shape = useMemo(() => roundedPath(size[0], size[1], radius), [size[0], size[1], radius])
  const outline = useMemo(() => shape.getPoints(8).map(p => [p.x, p.y, size[2] / 2 + .001] as Point), [shape, size[2]])
  return <group position={position} rotation={rotation}>
    <mesh position={[0, 0, -size[2] / 2]}><extrudeGeometry args={[shape, { depth: size[2], bevelEnabled: false, curveSegments: 8 }]} /><meshBasicMaterial color={color} polygonOffset polygonOffsetFactor={1} /></mesh>
    <Stroke points={outline} color={ink} />
    <Stroke points={outline.map(([x, y]) => [x, y, -size[2] / 2])} color={ink} />
  </group>
}

export function Ring({ radius, position = [0, 0, 0], color = INK }: { radius: number; position?: Point; color?: string }) {
  const points = useMemo(() => Array.from({ length: 65 }, (_, i) => [Math.cos(i / 64 * Math.PI * 2) * radius, Math.sin(i / 64 * Math.PI * 2) * radius, 0] as Point), [radius])
  return <group position={position}><Stroke points={points} color={color} /></group>
}

export type FaceKind = 'book' | 'reading' | 'inner' | 'notes' | 'id' | 'player' | 'height' | 'height-seated'
function makeTexture(kind: FaceKind, bookId: ReadingBookId) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200; canvas.height = kind === 'player' ? 346 : 1500
  const c = canvas.getContext('2d')!
  c.fillStyle = PAPER; c.fillRect(0, 0, canvas.width, canvas.height)
  c.strokeStyle = '#8b8b8b'; c.fillStyle = INK; c.lineWidth = 2
  const text = (s: string, x: number, y: number, size = 32) => { c.font = `${size}px monospace`; c.fillText(s, x, y) }
  const line = (x: number, y: number, w: number) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke() }
  if (kind === 'reading') {
    const book = getReadingBook(bookId)
    text('D.P. / PERSONAL LIBRARY', 100, 130, 27); line(100, 175, 1000)
    text(book.author.toUpperCase(), 100, 270, 27)
    book.lines.forEach((part, i) => {
      c.font = '145px Outfit, sans-serif'; c.fillText(part, 92, 475 + i * 154)
    })
    drawReadingArtwork(c, bookId, 100, 900, 1000, 310)
    line(100, 1320, 1000); text(book.topic, 100, 1385, 25)
  } else if (kind === 'book') {
    text('FIELD NOTES', 100, 190, 58); line(100, 260, 1000)
    text('D. PASIFIC', 100, 345, 36)
    text('a little', 100, 760, 110); text('context.', 100, 890, 110)
    text('PERSON / WORK / EDUCATION', 100, 1350, 28)
  } else if (kind === 'inner') {
    text('D. PASIFIC', 100, 180, 34); line(100, 240, 1000)
    text('the', 100, 650, 94); text('person.', 100, 770, 94)
    text('Engineer. Builder. Curious human.', 100, 1280, 28); text('JAKARTA / INDONESIA', 100, 1360, 26)
  } else if (kind === 'notes') {
    text('NOTES FROM BUILDING', 100, 180, 42); line(100, 235, 1000)
    text('thinking', 100, 430, 115); text('out loud.', 100, 565, 115)
    for (let i = 0; i < 15; i++) line(100, 700 + i * 38, i % 4 ? 1000 : 650)
    text('05 / WRITING', 100, 1400, 30)
  } else if (kind === 'id') {
    text('PERSONAL SPACE', 110, 180, 46); text('DP', 100, 720, 360); line(100, 850, 1000)
    text('DIERTA PASIFIC', 100, 1000, 65); text('engineer / curious human', 100, 1090, 32)
    for (let i = 0; i < 60; i++) c.fillRect(100 + i * 16, 1250, i % 3 ? 4 : 9, 100)
  } else if (kind === 'player') {
    c.fillStyle = '#292929'; c.fillRect(0, 0, 1200, 346); c.fillStyle = '#ededed'; c.strokeStyle = '#6a6a6a'
    text('DP / LISTENING ROOM', 45, 57, 24); line(45, 82, 1110)
    text('listening.', 45, 204, 84); text('QUEUE / EMPTY', 45, 295, 24)
    c.beginPath(); c.moveTo(1080, 142); c.lineTo(1080, 204); c.lineTo(1125, 173); c.closePath(); c.stroke()
  } else {
    text(kind === 'height' ? '112' : '85', 110, 980, 500)
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4
  return texture
}

export function Face({ kind, position, size, rotation = [0, 0, 0], book = 'atomic-habits' }: { kind: FaceKind; position: Point; size: [number, number]; rotation?: Point; book?: ReadingBookId }) {
  const texture = useMemo(() => makeTexture(kind, book), [kind, book])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={position} rotation={rotation}><planeGeometry args={size} /><meshBasicMaterial map={texture} /></mesh>
}

export const Keyboard = memo(function Keyboard() {
  // MX Keys Mini: low wedge, compact staggered keys, inset circular dishes and split arrows.
  const rows = [
    [.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
    [1.35, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.15],
    [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.9],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 2.5],
    [1, 1, 1.1, 1.2, 4.3, 1.1, 1, 1, 1, 1],
  ]
  return <group position={keyboardPosition} rotation={[-.055, 0, 0]}>
    <Plate size={[2.19, .96, .055]} radius={.065} rotation={[-Math.PI / 2, 0, 0]} color="#e9e9e9" ink="#606060" />
    <Block size={[1.98, .075, .11]} position={[0, -.005, -.39]} ink="#969696" />
    {rows.map((row, r) => {
      const total = row.reduce((sum, w) => sum + w, 0); let start = -.99
      return row.map((units, i) => {
        const width = units / total * 1.98 - .025, x = start + width / 2; start += width + .025
        return <group key={`${r}-${i}`} position={[x, .039, -.365 + r * .143]} rotation={[-Math.PI / 2, 0, 0]}>
          <Plate size={[width, r === 0 ? .09 : .118, .012]} radius={.024} ink="#888888" color="#f8f8f8" />
          {r > 0 && units < 1.2 && <mesh position={[0, 0, .007]}><ringGeometry args={[.029, .031, 18]} /><meshBasicMaterial color="#d1d1d1" /></mesh>}
          {r === 5 && i >= 8 && <Stroke points={[[-width / 2 + .012, 0, .008], [width / 2 - .012, 0, .008]]} color="#aaa" />}
        </group>
      })
    })}
  </group>
})
