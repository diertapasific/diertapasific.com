'use client'

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ArrowUpRight } from '@phosphor-icons/react'
import * as THREE from 'three'
import { POSTS } from '../pages/Blog'
import { Block } from './geometry'
import { ProjectedSurface } from './ProjectedSurface'
import { focusView } from './model'
import { motionProgress, paperPosition } from './motion'
import type { DeskMotion } from './motion'
import { advancePaperDeck, articleDisplayHeight, articleStackPose, articleTurnPose, createPaperDeck } from './articleMotion'
import type { PaperDeck } from './articleMotion'
import { paperTexture } from './paperTexture'

const PaperArticleBody = lazy(() => import('./PaperArticleBody'))

function ArticleBodyLoading() {
  return <div role="status" aria-label="Loading article" className="mt-6 min-h-48 space-y-4">{[0, 1, 2, 3, 4].map(line => <div key={line} className={`h-3 animate-pulse bg-zinc-200 ${line === 4 ? 'w-2/3' : 'w-full'}`} />)}</div>
}

function ArticleFace({ index }: { index: number }) {
  const texture = useMemo(() => {
    const post = POSTS[index], canvas = document.createElement('canvas')
    canvas.width = 1200; canvas.height = 1644
    const c = canvas.getContext('2d')!
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
}

function ArticleSurface({ index, onSelect, elementRef, capture, hidden = false }: { index: number; onSelect: (index: number) => void; elementRef?: RefObject<HTMLDivElement>; capture?: (element: HTMLDivElement) => boolean; hidden?: boolean }) {
  const { size } = useThree(), heading = useRef<HTMLHeadingElement>(null), sheetNav = useRef<HTMLElement>(null)
  const local = useRef<HTMLDivElement>(null), root = elementRef || local
  const { zoom } = focusView('writing', size.width, size.height)
  const width = Math.round(1.15 * zoom), height = Math.round(1.6 * zoom), post = POSTS[index]
  useEffect(() => { if (!capture && !hidden) heading.current?.focus({ preventScroll: true }) }, [index, capture, hidden])
  useEffect(() => {
    if (!sheetNav.current) return
    const nav = sheetNav.current, selected = nav.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (selected) nav.scrollLeft = selected.offsetLeft - nav.offsetLeft - (nav.clientWidth - selected.offsetWidth) / 2
  }, [index, width])
  useEffect(() => {
    if (!capture) return
    let frame = 0
    const ready = () => {
      if (root.current?.parentElement?.dataset.renderMode === 'native' && root.current.querySelector('[data-article-ready]') && capture(root.current)) return
      frame = requestAnimationFrame(ready)
    }
    frame = requestAnimationFrame(ready)
    return () => cancelAnimationFrame(frame)
  }, [capture, root])
  return <ProjectedSurface position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[1.15, 1.6]} pixelWidth={width} pixelHeight={height}>
    <div ref={root} data-object-surface={capture ? undefined : 'writing'} data-article-index={index} aria-hidden={capture || hidden ? true : undefined} aria-busy={hidden || undefined} className="flex flex-col overflow-hidden bg-[#f8f8f8] font-sans text-[#2a2a2a]" style={{ width, height, touchAction: 'auto', visibility: capture || hidden ? 'hidden' : undefined, pointerEvents: capture || hidden ? 'none' : 'auto' }} onKeyDown={event => {
      if (hidden || capture) return
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (step && POSTS[index + step] && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); onSelect(index + step) }
    }}>
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 px-5 py-3 font-mono text-[9px] text-zinc-500"><span>NOTES FROM BUILDING</span><span>{String(index + 1).padStart(2, '0')} / {String(POSTS.length).padStart(2, '0')}</span></header>
      <article key={index} aria-label={post.title} className="surface-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <p className="eyebrow">{post.date}</p>
        <h2 ref={heading} tabIndex={-1} className="mt-5 text-[27px] leading-[1.15] tracking-[-.035em] outline-none">{post.title}</h2>
        <Suspense fallback={<ArticleBodyLoading />}><PaperArticleBody url={post.href} title={post.title} preview={post.preview} /></Suspense>
        <a href={post.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[12px] text-zinc-500 underline decoration-zinc-400 underline-offset-4 active:scale-[.98]">original on Medium<ArrowUpRight size={14} /></a>
        <p className="mt-7 border-t border-zinc-200 pt-4 font-mono text-[9px] text-zinc-400">DIERTA PASIFIC / MEDIUM</p>
      </article>
      <nav ref={sheetNav} aria-label="Choose an article sheet" className="grid shrink-0 grid-flow-col auto-cols-[minmax(44px,1fr)] gap-1 overflow-x-auto overscroll-x-contain border-t border-zinc-300 px-3 py-2" style={{ touchAction: 'pan-x', scrollbarWidth: 'thin' }}>{POSTS.map((item, i) => <button key={item.href} aria-label={`Article ${i + 1}: ${item.title}`} aria-pressed={index === i} onClick={() => onSelect(i)} className={`min-h-11 font-mono text-[10px] transition-colors active:scale-[.98] ${index === i ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-200'}`}>{String(i + 1).padStart(2, '0')}</button>)}</nav>
    </div>
  </ProjectedSurface>
}

function ShufflingSheet({ texture, deck }: { texture: THREE.Texture; deck: MutableRefObject<PaperDeck> }) {
  const paper = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1.2, 1.65, 24, 12)
    const source = geometry.attributes.position.array.slice()
    const edge = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(74 * 3), 3))
    const indices = [...Array.from({ length: 25 }, (_, i) => i), ...Array.from({ length: 12 }, (_, i) => (i + 1) * 25 + 24), ...Array.from({ length: 24 }, (_, i) => 12 * 25 + 23 - i), ...Array.from({ length: 12 }, (_, i) => (11 - i) * 25), 0]
    return { geometry, source, edge, indices }
  }, [])
  useEffect(() => () => { paper.geometry.dispose(); paper.edge.dispose() }, [paper])
  useFrame(() => {
    const bend = articleTurnPose(deck.current.progress).bend, positions = paper.geometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = paper.source[i * 3], z = -paper.source[i * 3 + 1]
      positions.setXYZ(i, x, .008 + bend * ((x + .6) / 1.2) ** 2, z)
    }
    positions.needsUpdate = true; paper.geometry.computeBoundingSphere()
    const edge = paper.edge.attributes.position
    paper.indices.forEach((i, n) => edge.setXYZ(n, positions.getX(i), positions.getY(i), positions.getZ(i)))
    edge.needsUpdate = true; paper.edge.computeBoundingSphere()
  })
  return <><mesh geometry={paper.geometry}><meshBasicMaterial map={texture} side={THREE.DoubleSide} /></mesh><lineLoop geometry={paper.edge}><lineBasicMaterial color="#999999" /></lineLoop></>
}

type Swap = { from: THREE.Texture; to: THREE.Texture }

export function ArticlePapers({ active, motion, reducedMotion }: { active: boolean; motion: MutableRefObject<DeskMotion>; reducedMotion: boolean }) {
  const deck = useRef(createPaperDeck()), displayed = useRef<THREE.Group>(null), outgoing = useRef<THREE.Group>(null), page = useRef<HTMLDivElement>(null)
  const [presentation, setPresentation] = useState({ index: 0, from: null as number | null })
  const previous = useRef(presentation)
  const [pending, setPending] = useState<number | null>(null), [swap, setSwap] = useState<Swap | null>(null)
  useEffect(() => () => { swap?.from.dispose(); swap?.to.dispose() }, [swap])
  useEffect(() => { if (!active || presentation.from === null) setSwap(null); if (!active) setPending(null) }, [active, presentation.from])
  useFrame((_, delta) => {
    if (!active) { deck.current.from = null; deck.current.progress = 1 }
    else advancePaperDeck(deck.current, delta, reducedMotion)
    const open = motionProgress(motion.current, 'writing'), turning = deck.current.from !== null
    const pose = articleTurnPose(deck.current.progress)
    if (displayed.current) displayed.current.position.y = turning ? pose.incomingHeight : articleDisplayHeight(open)
    if (outgoing.current) outgoing.current.position.set(pose.x, pose.height, 0)
    const next = { index: deck.current.index, from: deck.current.from }
    if (next.index !== previous.current.index || next.from !== previous.current.from) { previous.current = next; setPresentation(next) }
  })
  const select = (index: number) => {
    if (index === deck.current.index || pending !== null || swap || !POSTS[index]) return
    if (reducedMotion) deck.current.requested = index
    else setPending(index)
  }
  const capture = useCallback((target: HTMLDivElement) => {
    if (!page.current?.querySelector('[data-article-ready]') || pending === null) return false
    const dimensions = { width: 1.2, height: 1.65, contentWidth: 1.15, contentHeight: 1.6, offsetX: 0 }
    setSwap({ from: paperTexture(page.current, dimensions), to: paperTexture(target, dimensions) })
    deck.current.requested = pending; setPending(null)
    return true
  }, [pending])
  const turning = presentation.from !== null && swap !== null
  return <group position={paperPosition}>
    {Array.from({ length: turning ? 4 : 5 }, (_, rank) => {
      const pose = articleStackPose(rank)
      return <group key={rank} position={[0, pose.height, 0]} rotation={[0, pose.yaw, 0]}><Block size={[1.2, .014, 1.65]} ink="#a4a4a4" color="#f8f8f8" /></group>
    })}
    <group ref={displayed} position={[0, .2325, 0]}>
      <Block size={[1.2, .014, 1.65]} ink="#999999" color="#f8f8f8" />
      {turning ? <mesh position={[0, .011, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.2, 1.65]} /><meshBasicMaterial map={swap.to} /></mesh> : <ArticleFace index={presentation.index} />}
      {active && <ArticleSurface index={presentation.index} onSelect={select} elementRef={page} hidden={turning} />}
      {active && pending !== null && <ArticleSurface index={pending} onSelect={select} capture={capture} />}
    </group>
    {turning && <group ref={outgoing}><ShufflingSheet texture={swap.from} deck={deck} /></group>}
    <group position={[.75, .14, -.05]} rotation={[Math.PI / 2, 0, -.12]}><mesh><cylinderGeometry args={[.022, .022, .92, 12]} /><meshBasicMaterial color="#aaa" /></mesh><Block size={[.025, .15, .025]} position={[.025, .28, 0]} /></group>
  </group>
}
