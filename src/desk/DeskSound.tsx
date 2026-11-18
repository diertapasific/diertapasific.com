'use client'

import { useEffect, useRef, useState } from 'react'
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react'
import { createDeskClick } from './deskClick'

export function DeskSound({ disabled }: { disabled: boolean }) {
  const [enabled, setEnabled] = useState(() => { try { return localStorage.getItem('dipa-desk-click-sound') !== 'off' } catch { return true } })
  const enabledRef = useRef(enabled), audio = useRef<{ context: AudioContext; click: () => void } | null>(null)
  enabledRef.current = enabled
  useEffect(() => { try { localStorage.setItem('dipa-desk-click-sound', enabled ? 'on' : 'off') } catch { /* The control still works without storage. */ } }, [enabled])
  useEffect(() => {
    let disposed = false, start: { id: number; x: number; y: number } | null = null, dragged = false
    const down = (event: PointerEvent) => {
      if (!event.isPrimary) { dragged = true; return }
      start = { id: event.pointerId, x: event.clientX, y: event.clientY }; dragged = false
    }
    const move = (event: PointerEvent) => { if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 6) dragged = true }
    const cancel = () => { start = null; dragged = true }
    const click = (event: MouseEvent) => {
      const target = event.target as Element
      if (!enabledRef.current || !event.isTrusted || event.button !== 0 || event.detail !== 0 && dragged || !target.closest?.('button,a,canvas,[role="button"]') || target.closest('[data-sound-toggle], [disabled], [aria-busy="true"]')) return
      if (!target.closest('.desk-app,[data-object-surface],.contact-card') || typeof AudioContext === 'undefined') return
      try {
        if (!audio.current) { const context = new AudioContext(); audio.current = { context, click: createDeskClick(context) } }
        const engine = audio.current
        if (engine.context.state === 'suspended') void engine.context.resume().then(() => { if (!disposed && enabledRef.current && engine.context.state === 'running') engine.click() }).catch(() => {})
        else if (engine.context.state === 'running') engine.click()
      } catch { /* Browsers may block or disable audio; navigation still works. */ }
    }
    document.addEventListener('pointerdown', down, true); document.addEventListener('pointermove', move, true); document.addEventListener('pointercancel', cancel, true); document.addEventListener('click', click, true)
    return () => { disposed = true; document.removeEventListener('pointerdown', down, true); document.removeEventListener('pointermove', move, true); document.removeEventListener('pointercancel', cancel, true); document.removeEventListener('click', click, true); void audio.current?.context.close().catch(() => {}); audio.current = null }
  }, [])
  return <button type="button" data-sound-toggle disabled={disabled} onClick={() => setEnabled(value => !value)} aria-label={enabled ? 'Mute click sounds' : 'Enable click sounds'} aria-pressed={enabled} title={enabled ? 'Mute click sounds' : 'Enable click sounds'} className="flex size-11 shrink-0 items-center justify-center text-zinc-500 active:scale-[.98]">{enabled ? <SpeakerHigh size={17} /> : <SpeakerSlash size={17} />}</button>
}
