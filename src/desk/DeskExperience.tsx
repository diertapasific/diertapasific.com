'use client'

import { Component, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowsOutCardinal, X, ArrowCounterClockwise, IconContext, Moon, Sun, ChatCircle } from '@phosphor-icons/react'
import Content from './Content'
import { destinations, readLocation } from './model'
import type { Destination, AboutSection } from './model'
import './desk.css'
import { initialOpeningMode, openingSessionKey } from './opening'
import type { OpeningMode } from './opening'
import { useTifaChat } from './useTifaChat'
import { TifaConversation } from './TifaConversation'
import { DeskNavigation } from './DeskNavigation'
import { loadPaperArticle } from './loadPaperArticle'
import type { TifaSource } from './tifaAnswers'

const DeskScene = lazy(() => import('./DeskScene'))

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

function SceneSkeleton() {
  return <div className="scene-loading pointer-events-none absolute inset-0 flex items-center justify-center" role="status"><div className="w-52"><div className="loading-monitor mx-auto h-24 w-36 border border-zinc-300" /><div className="mx-auto h-8 w-px bg-zinc-300" /><div className="h-px w-full bg-zinc-300" /><p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500">drawing the desk</p></div></div>
}

export default function DeskExperience() {
  const [route, setRoute] = useState(readLocation)
  const chat = useTifaChat()
  const [projectRequest,setProjectRequest] = useState<{id:string;revision:number;article?:boolean}|null>(null)
  const [openingMode, setOpeningMode] = useState<OpeningMode>(() => {
    let seen = false
    try { seen = sessionStorage.getItem(openingSessionKey) === 'true' } catch { /* The full opening still works without storage. */ }
    const initial=readLocation()
    return initialOpeningMode(initial.destination||initial.companion, seen, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  })
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reset, setReset] = useState(0)
  const standing = true, reducedMotion = false
  const [dark, setDark] = useState(() => {
    try { const saved = localStorage.getItem('dipa-desk-theme'); if (saved) return saved === 'dark' } catch { /* Storage can be disabled. */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const sceneSurface = useRef<HTMLDivElement>(null)
  const [sceneKey, setSceneKey] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const selected = route.destination
  const chatOpen=Boolean(route.companion),focused=Boolean(selected)||chatOpen
  const opening = openingMode !== 'none' && !failed
  const active = destinations.find(item => item.id === selected)
  const onReady = useCallback(() => setReady(true), [])
  const onFailure = useCallback(() => { setFailed(true); setReady(false); setOpeningMode('none') }, [])
  const onOpeningComplete = useCallback(() => {
    try { sessionStorage.setItem(openingSessionKey, 'true') } catch { /* Arrival does not depend on persistence. */ }
    setOpeningMode('none')
  }, [])

  useLayoutEffect(() => {
    const surface = sceneSurface.current, main = surface?.closest<HTMLElement>('.desk-app')
    if (surface) surface.inert = opening
    if (!opening) return
    // The speaker keeps its native colors in a body portal, outside the theme filter.
    const previousScreen = document.body.style.getPropertyValue('--desk-opening-screen')
    document.body.style.setProperty('--desk-opening-screen', '0')
    return () => {
      if (surface) surface.inert = false
      if (previousScreen) document.body.style.setProperty('--desk-opening-screen', previousScreen)
      else document.body.style.removeProperty('--desk-opening-screen')
      for (const name of ['scene', 'copy', 'chrome', 'labels']) main?.style.removeProperty(`--desk-opening-${name}`)
    }
  }, [opening])

  const navigate = useCallback((destination: Destination | null, about: AboutSection = 'intro') => {
    if (opening) return
    if (destination === 'writing') void loadPaperArticle().catch(() => {})
    if (destination) returnFocus.current = document.activeElement as HTMLElement
    const hash = destination ? `#${destination}${destination === 'about' && about !== 'intro' ? `/${about}` : ''}` : '#desk'
    window.history.pushState(null, '', hash)
    setRoute({ destination, about })
    if (!destination) { setReset(v => v + 1); requestAnimationFrame(() => {
      const previous = returnFocus.current
      if (previous?.isConnected && previous.matches('button, a, input')) previous.focus()
      else document.querySelector<HTMLButtonElement>('[data-destination="projects"]')?.focus()
    }) }
  }, [opening])
  const onSelect = useCallback((id: Destination) => navigate(id), [navigate])
  const onDismiss = useCallback(() => navigate(null), [navigate])
  const onDockSelect = useCallback((id: Destination) => navigate(id === selected ? null : id), [navigate, selected])
  const onAboutSection = useCallback((section: AboutSection) => navigate('about', section), [navigate])
  const onAsk=useCallback(()=>{
    if(opening||chatOpen)return
    returnFocus.current=document.activeElement as HTMLElement
    window.history.pushState(null,'','#ask')
    setRoute({destination:null,about:'intro',companion:true})
  },[opening,chatOpen])
  const onTifaSource=useCallback((source:TifaSource)=>{
    if(source.projectId)setProjectRequest(previous=>({id:source.projectId!,article:source.articleId===source.projectId,revision:(previous?.revision??0)+1}))
    navigate(source.destination,source.section??'intro')
  },[navigate])

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('desk-page')
    const change = () => { const next = readLocation(); setRoute(next); if (next.destination||next.companion) setOpeningMode('none'); else setReset(v => v + 1) }
    window.addEventListener('popstate', change); window.addEventListener('hashchange', change)
    return () => { document.documentElement.classList.remove('desk-page'); window.removeEventListener('popstate', change); window.removeEventListener('hashchange', change) }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('dipa-desk-theme', dark ? 'dark' : 'light') } catch { /* The toggle still works without persistence. */ }
    const previous = document.documentElement.style.backgroundColor
    document.documentElement.style.backgroundColor = dark ? '#191b1e' : '#f6f6f6'
    return () => { document.documentElement.style.backgroundColor = previous }
  }, [dark])
  useEffect(() => {
    if (selected) heading.current?.focus({ preventScroll: true })
  }, [selected])
  useEffect(()=>{
    if(!chatOpen)return
    const main=sceneSurface.current?.closest<HTMLElement>('.desk-app'),viewport=window.visualViewport
    if(!main)return
    let frame=0
    const measure=()=>{
      const typing=document.activeElement?.id==='tifa-question'
      const keyboard=typing&&viewport&&viewport.height<window.innerHeight-70
      if(keyboard){main.style.height=`${viewport.height}px`;main.style.minHeight=`${viewport.height}px`}
      else{main.style.removeProperty('height');main.style.removeProperty('min-height')}
      main.dataset.chatCompact=String(main.getBoundingClientRect().height<550)
    }
    const focus=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
    measure();viewport?.addEventListener('resize',measure);window.addEventListener('resize',measure)
    document.addEventListener('focusin',focus);document.addEventListener('focusout',focus)
    return()=>{cancelAnimationFrame(frame);viewport?.removeEventListener('resize',measure);window.removeEventListener('resize',measure);document.removeEventListener('focusin',focus);document.removeEventListener('focusout',focus);main.style.removeProperty('height');main.style.removeProperty('min-height');delete main.dataset.chatCompact}
  },[chatOpen])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (opening) return
      if(event.isComposing)return
      if (event.key === 'Escape' && (selected||chatOpen)) navigate(null)
      const el = event.target as HTMLElement
      if (el.matches('input,textarea,select') || el.isContentEditable || event.metaKey || event.ctrlKey || event.altKey) return
      const n = Number(event.key)
      if (n >= 1 && n <= 6) { event.preventDefault(); navigate(destinations[n - 1].id) }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [navigate, selected, opening,chatOpen])
  useEffect(() => {
    if (ready || failed) return
    const timer = window.setTimeout(onFailure, 20000)
    return () => window.clearTimeout(timer)
  }, [ready, failed, onFailure, sceneKey])

  return <IconContext.Provider value={{ weight: 'light', size: 18 }}>
    <main data-theme={dark ? 'dark' : 'light'} data-opening={openingMode} aria-busy={opening || undefined} className={`desk-app relative min-h-[100dvh] w-full overflow-hidden bg-[#f6f6f6] text-[#2a2a2a] ${opening ? 'is-opening' : ''} ${focused ? 'has-selection' : ''} ${chatOpen?'has-chat':''} ${selected === 'about' || selected === 'reading' ? 'has-book' : ''} ${reducedMotion ? 'reduce-motion' : ''}`}>
      {!opening && <a href="#desk-index" className="skip-link">skip to navigation</a>}
      <header className="desk-header absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <button disabled={opening} onClick={() => navigate(null)} className="flex min-h-11 items-center gap-3 text-[25px] tracking-[-.06em] active:scale-[.98]" aria-label="Dipa's desk, return home">dipa <span className="font-light text-zinc-400">/</span></button>
        <div className="flex items-center gap-3 md:gap-7">
          <span className="hidden font-mono text-[10px] uppercase tracking-[.15em] text-zinc-500 sm:block">a personal space</span>
          <button type="button" disabled={opening} onClick={onAsk} aria-label="Ask Tifa about Dipa" className="flex min-h-11 items-center gap-2 font-mono text-[10px] text-zinc-500 active:scale-[.98]"><ChatCircle size={16} /><span>ask Tifa</span></button>
          <button disabled={opening} onClick={() => setDark(v => !v)} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`${dark ? 'Light' : 'Dark'} mode`} className="flex size-11 shrink-0 items-center justify-center active:scale-[.98]">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </header>

      {!focused && <div className="desk-intro pointer-events-none absolute left-5 top-[112px] z-[4] md:left-10 md:top-[134px]">
        <p className="eyebrow mb-4">a few things that make me, me.</p>
        <h1 className="text-[32px] font-normal leading-[1.08] tracking-[-.055em] md:text-[44px]">a work in progress.</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-500">engineer. builder. curious human.<br /><span className="text-zinc-700">take a look around.</span></p>
      </div>}

      <div ref={sceneSurface} onClick={event => { if (failed && focused && event.target === event.currentTarget) onDismiss() }} className="scene-layer absolute inset-0" aria-label="Interactive 3D desk. Drag to look around or choose an object from the navigation.">
        {!failed && <SceneBoundary key={sceneKey} onError={onFailure}><Suspense fallback={null}><DeskScene onDismiss={onDismiss} chatOpen={chatOpen} onAsk={onAsk} replyPulse={chat.messages[chat.messages.length-1]?.id??0} projectRequest={projectRequest} openingMode={openingMode} onOpeningComplete={onOpeningComplete} dark={dark} selected={selected} onSelect={onSelect} aboutSection={route.about} onAboutSection={onAboutSection} standing={standing} surface={sceneSurface} reducedMotion={reducedMotion} reset={reset} onReady={onReady} onFailure={onFailure} /></Suspense></SceneBoundary>}
        {!ready && !failed && <SceneSkeleton />}
        {failed && !chatOpen && <div className="absolute inset-x-6 top-[45%] mx-auto max-w-sm border-y border-zinc-300 py-7 text-center"><p className="text-lg">The desk couldn't be drawn.</p><p className="mt-3 text-sm leading-relaxed text-zinc-500">You can still explore every section using the navigation below.</p><button onClick={() => { setFailed(false); setReady(false); setSceneKey(v => v + 1) }} className="mt-4 min-h-11 font-mono text-xs underline underline-offset-4">try loading again</button></div>}
      </div>

      {!focused && <div className="desk-instructions pointer-events-none absolute bottom-[143px] left-5 z-[4] md:bottom-[129px] md:left-10"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.1em] text-zinc-500"><ArrowsOutCardinal size={16} /><span className="hidden sm:inline">drag to look around</span><span className="sm:hidden">drag to look / tap to explore</span></div><p className="mt-2 hidden font-mono text-[10px] text-zinc-400 sm:block">click an object to get closer</p></div>}

      {focused && (!failed||chatOpen) && <div className="focus-toolbar pointer-events-none absolute inset-x-5 top-[82px] z-10 flex items-center justify-between md:inset-x-10 md:top-[94px]">
        <button onClick={() => navigate(null)} className="pointer-events-auto flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap bg-[#f6f6f6]/90 px-2 font-mono text-[11px] active:scale-[.98]"><ArrowLeft size={16} />back to desk<span className="ml-3 hidden text-[9px] text-zinc-400 md:inline">ESC</span></button>
        <span className="font-mono text-[10px] text-zinc-500">{chatOpen?'Tifa / desk companion':`${active?.number} / ${active?.object}`}</span>
      </div>}

      {!focused && <button disabled={opening} aria-label="Reset view" className="reset-view absolute bottom-[141px] right-5 z-[4] flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[.08em] text-zinc-500 md:bottom-[129px] md:right-10" onClick={() => setReset(v => v + 1)}><ArrowCounterClockwise size={16} /><span className="hidden sm:inline">reset view</span></button>}

      <TifaConversation open={chatOpen} chat={chat} surface={sceneSurface} onSource={onTifaSource} fallback={failed} />

      {active && failed && <section key={selected} className="detail-panel absolute z-10 flex flex-col border-zinc-300 bg-[#f6f6f6]" aria-labelledby="detail-title">
        <div className="sticky top-0 flex shrink-0 items-center justify-between border-b border-zinc-300 bg-[#f6f6f6] px-6 py-3 md:px-9 md:py-4"><button onClick={() => navigate(null)} className="flex min-h-11 items-center gap-2 font-mono text-[11px]"><ArrowLeft size={16} />back to desk</button><span className="hidden font-mono text-[10px] text-zinc-400 sm:inline">ESC</span><button aria-label="Close section" onClick={() => navigate(null)} className="flex size-11 items-center justify-center hover:bg-zinc-200/60"><X /></button></div>
        <div className="panel-scroll overflow-y-auto overscroll-contain px-6 pb-10 pt-7 md:px-9 md:pt-9">
          <p className="eyebrow">object {active.number} / {active.object}</p>
          <h2 ref={heading} tabIndex={-1} id="detail-title" className="mt-3 text-[38px] leading-none tracking-[-.055em] outline-none">{active.label}.</h2>
          <p className="mb-8 mt-3 text-sm text-zinc-500">{active.subtitle}</p>
          <Content destination={active.id} aboutSection={route.about} onAboutSection={section => navigate('about', section)} />
        </div>
      </section>}

      <footer id="desk-index" className="desk-footer pointer-events-none absolute inset-x-3 bottom-4 z-20 sm:inset-x-5 md:inset-x-10 md:bottom-6">
        <DeskNavigation selected={selected} disabled={opening} onSelect={onDockSelect} />
        <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.11em] text-zinc-500"><span className="whitespace-nowrap">© {new Date().getFullYear()} Dierta Pasific<span className="hidden sm:inline"> / Jakarta, Indonesia</span></span><span className="hidden md:inline">a desk, a few stories, an open invitation.</span><span>{chatOpen?'Tifa / conversation':selected ? `${active?.number} / exploring` : '00 / desk overview'}</span></div>
      </footer>
      <div className="sr-only" aria-live="polite">{opening ? 'Opening Dipa’s desk. Controls will be ready in a moment.' : chatOpen?'Chat with Tifa opened. Escape returns to the desk.': selected ? `${active?.label} opened. Escape returns to the desk.` : 'Desk overview. Choose an object or use the navigation below.'}</div>
    </main>
  </IconContext.Provider>
}
