'use client'

import { Component, lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ArrowUpRight } from '@phosphor-icons/react'
import * as THREE from 'three'
import { POSTS } from '../data/posts'
import { Block } from './geometry'
import { ProjectedSurface } from './ProjectedSurface'
import { focusView } from './model'
import { motionProgress, paperPosition } from './motion'
import type { DeskMotion } from './motion'
import { advancePaperDeck, articleDisplayHeight, articleStackPose, articleTurnPose, createPaperDeck } from './articleMotion'
import type { PaperDeck } from './articleMotion'
import { loadPaperArticle } from './loadPaperArticle'

const PaperArticleBody = lazy(loadPaperArticle)

function ArticleBodyLoading() {
  return <div role="status" aria-label="Loading article" className="mt-6 min-h-48 space-y-4">{[0, 1, 2, 3, 4].map(line => <div key={line} className={`h-3 animate-pulse bg-zinc-200 ${line === 4 ? 'w-2/3' : 'w-full'}`} />)}</div>
}

class ArticleReaderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div role="alert" className="mt-6 border-y border-zinc-300 py-4 text-sm leading-relaxed"><p>The article couldn't load.</p><button type="button" onClick={() => window.location.reload()} className="mt-2 min-h-11 underline underline-offset-4 active:scale-[.98]">reload article</button><p className="mt-2 text-xs text-zinc-500">You can also read the original on Medium below.</p></div> : this.props.children
  }
}

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
  const { size } = useThree(), heading = useRef<HTMLHeadingElement>(null), sheetNav = useRef<HTMLElement>(null)
  const { zoom } = focusView('writing', size.width, size.height)
  const width = Math.round(1.15 * zoom), height = Math.round(1.6 * zoom), post = POSTS[index]
  useEffect(() => {
    if (elementRef.current) elementRef.current.inert = !interactive
    if (interactive) heading.current?.focus({ preventScroll: true })
  }, [interactive, elementRef])
  useEffect(() => {
    const nav = sheetNav.current, selected = nav?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (nav && selected) nav.scrollLeft = selected.offsetLeft - nav.offsetLeft - (nav.clientWidth - selected.offsetWidth) / 2
  }, [index, width])
  return <ProjectedSurface nativeColors nativeLayout position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[1.15, 1.6]} pixelWidth={width} pixelHeight={height} layer={interactive ? 8 : 9} interactive={interactive}>
    <div ref={elementRef} data-theme={dark ? 'dark' : 'light'} data-object-surface={interactive ? 'writing' : undefined} data-article-index={index} aria-hidden={!interactive || undefined} className="writing-sheet flex flex-col overflow-hidden font-sans" style={{ width, height, touchAction: 'auto', pointerEvents: interactive ? 'auto' : 'none' }} onKeyDown={event => {
      if (!interactive) return
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (step && POSTS[index + step] && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); onSelect(index + step) }
    }}>
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 px-5 py-3 font-mono text-[9px] text-zinc-500"><span>NOTES FROM BUILDING</span><span>{String(index + 1).padStart(2, '0')} / {String(POSTS.length).padStart(2, '0')}</span></header>
      <article aria-label={post.title} className="surface-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <p className="eyebrow">{post.date}</p>
        <h2 ref={heading} tabIndex={-1} className="mt-5 text-[27px] leading-[1.15] tracking-[-.035em] outline-none">{post.title}</h2>
        <ArticleReaderBoundary><Suspense fallback={<ArticleBodyLoading />}><PaperArticleBody url={post.href} title={post.title} preview={post.preview} /></Suspense></ArticleReaderBoundary>
        <a href={post.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[12px] text-zinc-500 underline decoration-zinc-400 underline-offset-4 active:scale-[.98]">original on Medium<ArrowUpRight size={14} /></a>
        <p className="mt-7 border-t border-zinc-200 pt-4 font-mono text-[9px] text-zinc-400">DIERTA PASIFIC / MEDIUM</p>
      </article>
      <nav ref={sheetNav} aria-label="Choose an article sheet" className="grid shrink-0 grid-flow-col auto-cols-[minmax(44px,1fr)] gap-1 overflow-x-auto overscroll-x-contain border-t border-zinc-300 px-3 py-2" style={{ touchAction: 'pan-x', scrollbarWidth: 'thin' }}>{POSTS.map((item, i) => <button key={item.href} aria-label={`Article ${i + 1}: ${item.title}`} aria-pressed={index === i} onClick={() => onSelect(i)} className={`min-h-11 font-mono text-[10px] transition-colors active:scale-[.98] ${index === i ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-200'}`}>{String(i + 1).padStart(2, '0')}</button>)}</nav>
    </div>
  </ProjectedSurface>
}

const ArticleSheet = memo(function ArticleSheet({ index, outgoing, active, turning, deck, motion, onSelect, dark }: { dark: boolean; index: number; outgoing: boolean; active: boolean; turning: boolean; deck: MutableRefObject<PaperDeck>; motion: MutableRefObject<DeskMotion>; onSelect: (index: number) => void }) {
  const sheet = useRef<THREE.Group>(null), page = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const pose = articleTurnPose(deck.current.progress)
    if (sheet.current) sheet.current.position.set(outgoing ? pose.x : 0, outgoing ? pose.height : turning ? pose.incomingHeight : articleDisplayHeight(motionProgress(motion.current, 'writing')), 0)
    // Hide the outgoing text before its physical sheet returns under the stack.
    if (page.current) page.current.style.visibility = outgoing && deck.current.progress >= .48 ? 'hidden' : 'visible'
  }, -.5)
  return <group ref={sheet} position={[0, .2325, 0]}>
    <Block size={[1.2, .014, 1.65]} ink="#999999" color="#f8f8f8" />
    {active ? <ArticleSurface dark={dark} index={index} onSelect={onSelect} elementRef={page} interactive={!outgoing} /> : <ArticleFace index={index} />}
  </group>
})

export function ArticlePapers({ active, motion, reducedMotion, dark }: { dark: boolean; active: boolean; motion: MutableRefObject<DeskMotion>; reducedMotion: boolean }) {
  const deck = useRef(createPaperDeck())
  const [presentation, setPresentation] = useState({ index: 0, from: null as number | null })
  const previous = useRef(presentation)
  useFrame((_, delta) => {
    if (!active) { deck.current.from = null; deck.current.progress = 1; deck.current.requested = deck.current.index }
    else advancePaperDeck(deck.current, delta, reducedMotion)
    const next = { index: deck.current.index, from: deck.current.from }
    if (next.index !== previous.current.index || next.from !== previous.current.from) { previous.current = next; setPresentation(next) }
  }, -.75)
  const select = useCallback((index: number) => {
    if (POSTS[index]) deck.current.requested = index
  }, [])
  const from = active ? presentation.from : null, turning = from !== null
  return <group position={paperPosition}>
    {Array.from({ length: turning ? 4 : 5 }, (_, rank) => {
      const pose = articleStackPose(rank)
      return <group key={rank} position={[0, pose.height, 0]} rotation={[0, pose.yaw, 0]}><Block size={[1.2, .014, 1.65]} ink="#a4a4a4" color="#f8f8f8" /></group>
    })}
    {/* Stable article keys keep the outgoing DOM and scroll position alive. */}
    {(from === null ? [presentation.index] : [from, presentation.index]).map(index => <ArticleSheet dark={dark} key={index} index={index} outgoing={index === from} active={active} turning={turning} deck={deck} motion={motion} onSelect={select} />)}
    <group position={[.75, .14, -.05]} rotation={[Math.PI / 2, 0, -.12]}><mesh><cylinderGeometry args={[.022, .022, .92, 12]} /><meshBasicMaterial color="#aaa" /></mesh><Block size={[.025, .15, .025]} position={[.025, .28, 0]} /></group>
  </group>
}
