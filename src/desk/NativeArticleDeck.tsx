'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ArticlePage } from './ArticlePage'

function Sheet({ index, onSelect, dark, interactive, width, height, outgoing }: {
  index: number; onSelect: (index: number) => void; dark: boolean; interactive: boolean; width: number; height: number; outgoing: boolean;
}) {
  const page = useRef<HTMLDivElement>(null)
  return <div data-native-sheet={index} data-sheet-outgoing={outgoing || undefined} className="absolute inset-0" style={{ zIndex: outgoing ? 1 : 0, pointerEvents: outgoing ? 'none' : undefined }}>
    <ArticlePage index={index} onSelect={onSelect} dark={dark} interactive={interactive && !outgoing} elementRef={page} width={width} height={height} />
  </div>
}

export function NativeArticleDeck({ index, onSelect, dark, interactive, width, height }: {
  index: number; onSelect: (index: number) => void; dark: boolean; interactive: boolean; width: number; height: number;
}) {
  const root = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ index, from: null as number | null, revision: 0 })
  const start = useRef({ transform: 'none', opacity: '1' })
  useLayoutEffect(() => {
    if (index === view.index) return
    const node = root.current?.querySelector<HTMLElement>(`[data-native-sheet="${view.index}"]`)
    if (node) {
      const style = getComputedStyle(node)
      start.current = { transform: style.transform, opacity: style.opacity }
    }
    setView(previous => ({ index, from: previous.index, revision: previous.revision + 1 }))
  }, [index, view.index])
  useLayoutEffect(() => {
    if (view.from === null) return
    const finish = () => setView(current => current.revision === view.revision ? { ...current, from: null } : current)
    if (!interactive) { finish(); return }
    const previous = root.current?.querySelector<HTMLElement>(`[data-native-sheet="${view.from}"]`)
    const next = root.current?.querySelector<HTMLElement>(`[data-native-sheet="${view.index}"]`)
    if (!previous?.animate || !next) { finish(); return }
    let active = true
    const options: KeyframeAnimationOptions = { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' }
    const outgoing = previous.animate([
      { transform: start.current.transform, opacity: start.current.opacity },
      { transform: 'perspective(900px) translate3d(-28px,-10px,18px) rotateZ(-4deg) rotateY(-55deg)', opacity: 0 },
    ], options)
    const incoming = next.animate([
      { transform: 'perspective(900px) translate3d(5px,6px,0) rotateZ(1deg)', opacity: .35 },
      { transform: 'none', opacity: 1 },
    ], options)
    void Promise.all([outgoing.finished, incoming.finished]).then(() => { if (active) finish() }, () => undefined)
    return () => { active = false; outgoing.cancel(); incoming.cancel() }
  }, [view, interactive])
  return <div ref={root} data-native-paper-deck data-paper-turning={view.from !== null || undefined} className="relative" style={{ width, height }}>
    {(view.from === null ? [view.index] : [view.from, view.index]).map(sheet => <Sheet key={sheet} index={sheet} onSelect={onSelect} dark={dark} interactive={interactive} width={width} height={height} outgoing={sheet === view.from} />)}
  </div>
}
