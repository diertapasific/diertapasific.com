'use client'

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { IconContext } from '@phosphor-icons/react'
import Content, { aboutPages } from './Content'
import { ProjectWorkspace } from './ProjectWorkspace'
import { destinations, focusView } from './model'
import type { AboutSection, Destination, Point } from './model'
import { ProjectedSurface } from './ProjectedSurface'
import { MusicScreen } from './MusicScreen'
import { getReadingBook, readingPages } from './books'
import type { ReadingBookId } from './books'
import { bookPage } from './paperMotion'
import { ReadingArtwork } from './ReadingArtwork'

export function BookInscription({ destination, section = 'intro', book = 'atomic-habits', preview = false }: { destination: 'about' | 'reading'; section?: AboutSection; book?: ReadingBookId; preview?: boolean }) {
  const { size } = useThree()
  const { zoom } = focusView(destination, size.width, size.height)
  const width = Math.round(bookPage.width * zoom), height = Math.round(bookPage.height * zoom)
  const about = destination === 'about'
  const reading = getReadingBook(book)
  const chapter = {
    intro: { title: <>the<br />person.</>, note: 'Engineer. Builder. Curious human.', detail: 'JAKARTA / INDONESIA' },
    experience: { title: <>work &<br />experience.</>, note: 'AI, automation & backend systems.', detail: 'WORK / 2024 — PRESENT' },
    education: { title: <>education.</>, note: 'Bina Nusantara University.', detail: 'COMPUTER SCIENCE / 2021 — 2025' },
  }[section]
  return <ProjectedSurface position={[.65, .1 - bookPage.leftY, 0]} rotation={[Math.PI / 2, 0, Math.PI]} worldSize={[bookPage.width, bookPage.height]} pixelWidth={width} pixelHeight={height}>
    <div data-book-inscription={destination} data-inscription-page={about ? section : book} data-inscription-preview={preview || undefined} aria-hidden={preview || undefined} className={`book-inscription ${width < 260 ? 'book-inscription-compact' : ''} flex flex-col overflow-hidden bg-[#f6f6f6] font-mono text-[#424242]`} style={{ width, height, padding: `${height * (about ? .09 : .075)}px ${width * .08}px`, visibility: preview ? 'hidden' : undefined, pointerEvents: preview ? 'none' : undefined }}>
      {!about ? <>
        <div className="flex items-center justify-between border-b border-zinc-300 pb-3" style={{ fontSize: Math.max(6, width * .024) }}><span>D.P. / PERSONAL LIBRARY</span><span>{`0${readingPages.indexOf(book) + 1}`}</span></div>
        <p className="mt-5 uppercase tracking-[.08em] text-zinc-500" style={{ fontSize: Math.max(7, width * .027) }}>{reading.author}</p>
        <p className="mt-4 font-sans font-normal leading-[1.04] tracking-[-.055em]" style={{ fontSize: width * .135 }}>{reading.lines.map(line => <span key={line} className="block">{line}</span>)}</p>
        <div className="my-5 min-h-0 flex-1"><ReadingArtwork book={book} /></div>
        <div className="flex shrink-0 items-end justify-between gap-4 border-t border-zinc-300 pt-3" style={{ fontSize: Math.max(6, width * .022) }}><p className="max-w-[65%] leading-relaxed">{reading.topic}</p><p className="text-right leading-relaxed">READ &<br />REFLECTED ON</p></div>
      </> : <>
      <p className="border-b border-zinc-300 pb-5" style={{ fontSize: Math.max(7, width * .027) }}>D. PASIFIC</p>
      <p className="mt-5 uppercase" style={{ fontSize: Math.max(7, width * .026) }}>{`CHAPTER 0${aboutPages.indexOf(section) + 1} / 03`}</p>
      <p className="my-auto leading-[1.3] tracking-tight" style={{ fontSize: width < 260 ? Math.max(14, width * .105) : width * .078 }}>{chapter.title}</p>
      <div className="space-y-4" style={{ fontSize: Math.max(7, width * .026) }}>
        <p>{chapter.note}</p>
        <p style={{ fontSize: Math.max(6, width * .021) }}>{chapter.detail}</p>
      </div>
      </>}
    </div>
  </ProjectedSurface>
}


export function ObjectSurface({ destination, position, rotation = [0, 0, 0], worldSize, pixelScale = 1, aboutSection, onAboutSection, reducedMotion, dark = false, interactive = true, projectRequest }: {
  destination: Destination; position: Point; rotation?: Point; worldSize: [number, number]; pixelScale?: number; aboutSection: AboutSection; onAboutSection: (section: AboutSection) => void; reducedMotion: boolean; interactive?: boolean; dark?: boolean;
  projectRequest?: {id:string;revision:number;article?:boolean}|null;
}) {
  const { size } = useThree()
  const view = focusView(destination, size.width, size.height)
  const faceHeightScale = destination === 'music' ? view.offset[2] / Math.hypot(...view.offset) : 1
  const pixelWidth = Math.round(worldSize[0] * view.zoom * pixelScale), pixelHeight = Math.round(worldSize[1] * view.zoom * pixelScale * faceHeightScale)
  const root = useRef<HTMLDivElement>(null)
  const item = destinations.find(d => d.id === destination)!
  useEffect(() => {
    if (root.current) root.current.inert = !interactive
    if (!interactive) return
    const timer = window.setTimeout(() => root.current?.querySelector<HTMLElement>('[data-surface-heading]')?.focus({ preventScroll: true }), reducedMotion ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [destination, reducedMotion, interactive])
  return <ProjectedSurface position={position} rotation={rotation} worldSize={worldSize} pixelWidth={pixelWidth} pixelHeight={pixelHeight} interactive={interactive} nativeColors={destination === 'music'}>
    <IconContext.Provider value={{ weight: 'light', size: 18 }}>
      <div ref={root} data-object-surface={destination} aria-hidden={!interactive || undefined} className={`object-surface surface-${destination} ${reducedMotion ? 'reduce-motion' : ''}`} style={{ width: pixelWidth, height: pixelHeight, pointerEvents: interactive ? 'auto' : 'none' }}>
        {destination === 'projects' ? <ProjectWorkspace compact={view.mobile} height={pixelHeight} requestedProject={projectRequest} /> : destination === 'music' ? <MusicScreen active={interactive} dark={dark} compact={pixelHeight < 160} dense={pixelHeight < 100} /> : <div className="flex h-full min-h-0 flex-col bg-[#f8f8f8]">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-300 px-5 py-3"><span className="eyebrow">{destination === 'contact' ? 'personal space / visitor pass' : `${item.number} / ${item.object}`}</span><span className="font-mono text-[9px] text-zinc-400">DP</span></div>
          <div className="surface-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5">
            <h2 data-surface-heading tabIndex={-1} className="mb-5 text-[30px] leading-none tracking-[-.05em] outline-none">{item.label}.</h2>
            <Content destination={destination} aboutSection={aboutSection} onAboutSection={onAboutSection} />
          </div>
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-zinc-200 px-5 font-mono text-[9px] text-zinc-400"><span>{destination === 'about' ? aboutSection : 'dierta pasific'}</span><span>{item.number}</span></div>
        </div>}
      </div>
    </IconContext.Provider>
  </ProjectedSurface>
}
