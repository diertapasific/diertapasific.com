'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Texture } from 'three'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import { ProjectedSurface } from './ProjectedSurface'
import { CurlingPage } from './CurlingPage'
import { paperTexture } from './paperTexture'
import { focusView } from './model'
import { bookPage, paperSize } from './paperMotion'

type Turn<Page extends string> = { to: Page; forward: boolean; front: Texture; back: Texture; left: Texture; right: Texture }

type BookProps<Page extends string> = {
  destination: 'about' | 'reading'; section: Page; onSection: (section: Page) => void; reducedMotion: boolean;
  pages: readonly Page[]; pageLabel: (page: Page) => string; header: string;
  renderContent: (page: Page) => ReactNode; renderInscription: (page: Page, preview: boolean) => ReactNode;
}

function NotebookPage<Page extends string>({ section, onSection, width, height, busy, capture, elementRef, hidden = false, destination, pages, pageLabel, header, renderContent }: Pick<BookProps<Page>, 'section' | 'onSection' | 'destination' | 'pages' | 'pageLabel' | 'header' | 'renderContent'> & {
  width: number; height: number; busy: boolean;
  capture?: (element: HTMLDivElement) => boolean; elementRef?: RefObject<HTMLDivElement>; hidden?: boolean;
}) {
  const localRef = useRef<HTMLDivElement>(null), root = elementRef || localRef
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!busy && !capture) content.current?.focus({ preventScroll: true }) }, [section, busy, capture])
  useEffect(() => {
    if (!capture) return
    let frame = 0
    const ready = () => {
      if (root.current?.parentElement?.dataset.renderMode === 'native' && capture(root.current)) return
      frame = requestAnimationFrame(ready)
    }
    frame = requestAnimationFrame(ready)
    return () => cancelAnimationFrame(frame)
  }, [capture, root])
  return <div ref={root} data-object-surface={capture ? undefined : destination} data-book-page={section} aria-hidden={capture || hidden ? true : undefined} aria-busy={busy || undefined}
    className={`surface-${destination} ${width < 260 ? 'book-page-compact' : ''} flex flex-col overflow-hidden bg-[#f8f8f8] font-sans text-[#2a2a2a]`}
    style={{ width, height, pointerEvents: capture || hidden ? 'none' : 'auto', visibility: capture || hidden ? 'hidden' : undefined, touchAction: 'auto' }}
    onKeyDown={event => {
      if (busy || capture || event.altKey || event.ctrlKey || event.metaKey) return
      const index = pages.indexOf(section), step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (step && pages[index + step]) { event.preventDefault(); onSection(pages[index + step]) }
    }}>
    <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 px-5 py-3 font-mono text-[9px] text-zinc-500"><span>{header}</span><span>{String(pages.indexOf(section) + 1).padStart(2, '0')} / {String(pages.length).padStart(2, '0')}</span></header>
    <div key={section} ref={content} role="region" aria-label={`${pageLabel(section)} content`} tabIndex={capture ? undefined : -1} className="surface-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6 outline-none">
      {renderContent(section)}
    </div>
    <nav aria-label={destination === 'reading' ? 'Browse books' : 'Turn notebook pages'} className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-300 px-5 py-2 font-mono text-[10px]">
      <button aria-label="Previous page" disabled={busy || pages.indexOf(section) === 0} onClick={() => onSection(pages[pages.indexOf(section) - 1])} className="flex min-h-11 items-center gap-2 active:scale-[.98] disabled:opacity-25"><ArrowLeft size={15} />previous</button>
      <button aria-label={pages.indexOf(section) < pages.length - 1 ? `Next page: ${pageLabel(pages[pages.indexOf(section) + 1])}` : 'Last page'} disabled={busy || pages.indexOf(section) === pages.length - 1} onClick={() => onSection(pages[pages.indexOf(section) + 1])} className="flex min-h-11 items-center gap-2 active:scale-[.98] disabled:opacity-25">{pages.indexOf(section) === pages.length - 1 ? 'last page' : destination === 'reading' ? 'next book' : pageLabel(pages[pages.indexOf(section) + 1])}<ArrowRight size={15} /></button>
    </nav>
  </div>
}

export function TurningBook<Page extends string>({ section, onSection, reducedMotion, destination, pages, pageLabel, header, renderContent, renderInscription }: BookProps<Page>) {
  const pageProps = { destination, pages, pageLabel, header, renderContent, onSection }
  const { size } = useThree()
  const { zoom } = focusView(destination, size.width, size.height)
  const width = Math.round(bookPage.width * zoom), height = Math.round(bookPage.height * zoom)
  const [displayed, setDisplayed] = useState(section)
  const [turn, setTurn] = useState<Turn<Page> | null>(null)
  const page = useRef<HTMLDivElement>(null)
  const sceneRoot = useRef<HTMLElement | null>(null)
  const phase = useRef<'idle' | 'turning' | 'landing'>('idle')
  useEffect(() => () => {
    if (sceneRoot.current?.dataset.bookTurning === destination) delete sceneRoot.current.dataset.bookTurning
  }, [destination])
  useFrame(() => {
    if (!turn || phase.current !== 'landing') return
    const right = page.current
    const left = sceneRoot.current?.querySelector<HTMLElement>(`[data-book-inscription="${destination}"]:not([data-inscription-preview])`)
    if (right?.dataset.bookPage !== turn.to || left?.dataset.inscriptionPage !== turn.to) return
    if (right.parentElement?.dataset.renderMode !== 'native' || left.parentElement?.dataset.renderMode !== 'native') return
    // Both HTML roots now contain the landed spread. Reveal them in the same
    // frame, with the matching WebGL pages underneath until React removes them.
    if (sceneRoot.current) delete sceneRoot.current.dataset.bookTurning
    phase.current = 'idle'; setTurn(null)
  })
  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(section); setTurn(null); phase.current = 'idle'
      if (sceneRoot.current?.dataset.bookTurning === destination) delete sceneRoot.current.dataset.bookTurning
    }
  }, [section, reducedMotion, destination])
  useEffect(() => () => { if (turn) { turn.front.dispose(); turn.back.dispose(); turn.left.dispose(); turn.right.dispose() } }, [turn])
  const capture = useCallback((target: HTMLDivElement) => {
    const source = page.current, scene = source?.closest('.scene-layer')
    const leftPage = scene?.querySelector<HTMLElement>(`[data-book-inscription="${destination}"]:not([data-inscription-preview])`)
    const nextLeft = scene?.querySelector<HTMLElement>(`[data-book-inscription="${destination}"][data-inscription-preview]`)
    if (!source || !leftPage || !nextLeft || nextLeft.parentElement?.dataset.renderMode !== 'native') return false
    sceneRoot.current = scene as HTMLElement
    const sheet = { ...paperSize, contentWidth: bookPage.width, contentHeight: bookPage.height, offsetX: 0 }
    const from = paperTexture(source, sheet), to = paperTexture(target, sheet)
    const forward = pages.indexOf(section) > pages.indexOf(displayed)
    const left = paperTexture(forward ? leftPage : nextLeft, sheet)
    const back = paperTexture(forward ? nextLeft : leftPage, sheet); back.repeat.x = -1; back.offset.x = 1
    setTurn({ to: section, forward, front: forward ? from : to, right: forward ? to : from, left, back })
    return true
  }, [section, displayed, destination, pages])
  return <>
    <group position={[-.65, .1, 0]} rotation={[0, 0, Math.PI]}>
      {renderInscription(displayed, false)}
      {!turn && displayed !== section && !reducedMotion && renderInscription(section, true)}
    </group>
    <ProjectedSurface position={[bookPage.rightX, bookPage.rightY, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[bookPage.width, bookPage.height]} pixelWidth={width} pixelHeight={height}>
      <NotebookPage {...pageProps} section={displayed} onSection={onSection} width={width} height={height} busy={!!turn} elementRef={page} />
    </ProjectedSurface>
    {!turn && displayed !== section && !reducedMotion && <ProjectedSurface position={[bookPage.rightX, bookPage.rightY, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[bookPage.width, bookPage.height]} pixelWidth={width} pixelHeight={height}>
      <NotebookPage {...pageProps} section={section} onSection={onSection} width={width} height={height} busy={false} capture={capture} />
    </ProjectedSurface>}
    {turn && <>
      <mesh position={[bookPage.rightX, bookPage.rightY - .001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[paperSize.width, paperSize.height]} /><meshBasicMaterial map={turn.right} /></mesh>
      <mesh position={[bookPage.leftX, bookPage.leftY - .001, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[paperSize.width, paperSize.height]} /><meshBasicMaterial map={turn.left} /></mesh>
      <CurlingPage forward={turn.forward} front={turn.front} back={turn.back} onStart={() => {
        phase.current = 'turning'
        if (sceneRoot.current) sceneRoot.current.dataset.bookTurning = destination
      }} onComplete={() => { phase.current = 'landing'; setDisplayed(turn.to) }} />
      <ProjectedSurface position={[bookPage.rightX, bookPage.rightY, 0]} rotation={[-Math.PI / 2, 0, 0]} worldSize={[bookPage.width, bookPage.height]} pixelWidth={width} pixelHeight={height}>
        <span className="sr-only" role="status">Turning to {pageLabel(turn.to)}.</span>
      </ProjectedSurface>
    </>}
  </>
}
