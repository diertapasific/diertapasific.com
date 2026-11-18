'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { POSTS } from '../data/posts'
import { Block } from './geometry'
import { ProjectedSurface } from './ProjectedSurface'
import { focusView } from './model'
import { motionProgress, paperPosition } from './motion'
import type { DeskMotion } from './motion'
import { advancePaperDeck, articleDisplayHeight, articleStackPose, articleTurnPose, createPaperDeck } from './articleMotion'
import type { PaperDeck } from './articleMotion'
import { ArticlePage } from './ArticlePage'

const ArticleFace = memo(function ArticleFace({ index }: { index: number }) {
  const texture = useMemo(() => {
    const post = POSTS[index], canvas = document.createElement('canvas')
    // Only the desk thumbnail uses a texture; focused articles remain live text.
    canvas.width = 600; canvas.height = 822
    const c = canvas.getContext('2d')!
    c.scale(.5, .5)
    c.fillStyle = '#f8f8f8'; c.fillRect(0, 0, 1200, 1644); c.fillStyle = '#424242'
    c.font = '26px monospace'; c.fillText(`WRITING / ${String(index + 1).padStart(2, '0')}`, 90, 120); c.fillText(post.date.toUpperCase(), 90, 225)
    const wrapped = (text: string, y: number, size: number, leading: number) => {
      c.font = `${size}px Outfit, sans-serif`; let line = ''
      for (const word of text.split(' ')) {
        if (line && c.measureText(`${line} ${word}`).width > 1020) { c.fillText(line, 90, y); y += leading; line = word }
        else line = line ? `${line} ${word}` : word
      }
      c.fillText(line, 90, y); return y + leading
    }
    const y = wrapped(post.title, 390, 78, 92)
    wrapped(post.preview, y + 95, 39, 60)
    c.strokeStyle = '#b7b7b7'; c.beginPath(); c.moveTo(90, 1490); c.lineTo(1110, 1490); c.stroke()
    c.font = '26px monospace'; c.fillText('DIERTA PASIFIC / READ ON MEDIUM', 90, 1555)
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4
    return map
  }, [index])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[0, .011, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.15, 1.6]} /><meshBasicMaterial map={texture} /></mesh>
})

function ArticleSurface({ index, onSelect, elementRef, interactive, dark }: { dark: boolean; index: number; onSelect: (index: number) => void; elementRef: RefObject<HTMLDivElement>; interactive: boolean }) {
  const { size } = useThree()
  const { zoom } = focusView('writing', size.width, size.height)
  const width = Math.round(1.15 * zoom), height = Math.round(1.6 * zoom)
  return <ProjectedSurface nativeColors nativeLayout position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[1.15, 1.6]} pixelWidth={width} pixelHeight={height} layer={interactive ? 8 : 9} interactive={interactive}>
    <ArticlePage dark={dark} index={index} onSelect={onSelect} elementRef={elementRef} interactive={interactive} width={width} height={height} />
  </ProjectedSurface>
}

const ArticleSheet = memo(function ArticleSheet({ index, outgoing, active, turning, deck, motion, onSelect, dark }: { dark: boolean; index: number; outgoing: boolean; active: boolean; turning: boolean; deck: MutableRefObject<PaperDeck>; motion: MutableRefObject<DeskMotion>; onSelect: (index: number) => void }) {
  const sheet = useRef<THREE.Group>(null), page = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const pose = articleTurnPose(deck.current.progress)
    if (sheet.current) sheet.current.position.set(outgoing ? pose.x : 0, outgoing ? pose.height : turning ? pose.incomingHeight : articleDisplayHeight(motionProgress(motion.current, 'writing')), 0)
    // Hide the outgoing text before its physical sheet returns under the stack.
    const visibility = outgoing && deck.current.progress >= .48 ? 'hidden' : 'visible'
    if (page.current && page.current.style.visibility !== visibility) page.current.style.visibility = visibility
  }, -.5)
  return <group ref={sheet} position={[0, .2325, 0]}>
    <Block size={[1.2, .014, 1.65]} ink="#999999" color="#f8f8f8" />
    {active ? <ArticleSurface dark={dark} index={index} onSelect={onSelect} elementRef={page} interactive={!outgoing} /> : <ArticleFace index={index} />}
  </group>
})

export function ArticlePapers({ active, motion, reducedMotion, dark, nativeReader, index, onIndex }: { dark: boolean; active: boolean; motion: MutableRefObject<DeskMotion>; reducedMotion: boolean; nativeReader: boolean; index: number; onIndex: (index: number) => void }) {
  const deck = useRef(createPaperDeck())
  const [presentation, setPresentation] = useState({ index: 0, from: null as number | null })
  const previous = useRef(presentation)
  useEffect(() => { deck.current.requested = index }, [index])
  useFrame((_, delta) => {
    if (nativeReader) { deck.current.index = index; deck.current.requested = index; deck.current.from = null; deck.current.progress = 1 }
    else if (!active) { deck.current.from = null; deck.current.progress = 1; deck.current.requested = deck.current.index }
    else advancePaperDeck(deck.current, delta, reducedMotion)
    const next = { index: deck.current.index, from: deck.current.from }
    if (next.index !== previous.current.index || next.from !== previous.current.from) { previous.current = next; setPresentation(next) }
  }, -.75)
  const select = useCallback((index: number) => {
    if (POSTS[index]) { deck.current.requested = index; onIndex(index) }
  }, [onIndex])
  const from = active && !nativeReader ? presentation.from : null, turning = from !== null
  const visibleIndex = nativeReader ? index : presentation.index
  return <group position={paperPosition}>
    {Array.from({ length: turning ? 4 : 5 }, (_, rank) => {
      const pose = articleStackPose(rank)
      return <group key={rank} position={[0, pose.height, 0]} rotation={[0, pose.yaw, 0]}><Block size={[1.2, .014, 1.65]} ink="#a4a4a4" color="#f8f8f8" /></group>
    })}
    {/* Stable article keys keep the outgoing DOM and scroll position alive. */}
    {(from === null ? [visibleIndex] : [from, visibleIndex]).map(index => <ArticleSheet dark={dark} key={index} index={index} outgoing={index === from} active={active && !nativeReader} turning={turning} deck={deck} motion={motion} onSelect={select} />)}
    <group position={[.75, .14, -.05]} rotation={[Math.PI / 2, 0, -.12]}><mesh><cylinderGeometry args={[.022, .022, .92, 12]} /><meshBasicMaterial color="#aaa" /></mesh><Block size={[.025, .15, .025]} position={[.025, .28, 0]} /></group>
  </group>
}
