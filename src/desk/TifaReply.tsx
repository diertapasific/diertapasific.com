'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { TifaMessage } from './useTifaChat'
import type { TifaSource } from './tifaAnswers'
import { revealReply } from './replyReveal'

export const TifaReply = memo(function TifaReply({ message, animate, compact, onProgress, onComplete, onSource }: {
  message: TifaMessage; animate: boolean; compact: boolean; onProgress: () => void;
  onComplete: (id: number) => void; onSource: (source: TifaSource) => void;
}) {
  const [complete, setComplete] = useState(!animate)
  const text = useRef<HTMLSpanElement>(null)
  const completed = useRef(!animate), notified = useRef(false)
  const finishRef = useRef<() => void>(() => {})
  useEffect(() => {
    const node = text.current
    if (!node) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const write = (value: string) => { node.textContent = value; onProgress() }
    const completeReply = () => {
      completed.current = true; setComplete(true)
      if (!notified.current) { notified.current = true; onComplete(message.id) }
    }
    let reveal: ReturnType<typeof revealReply> | undefined
    const finish = () => { if (reveal) reveal.finish(); else { write(message.text); completeReply() } }
    finishRef.current = finish
    const visibility = () => { if (document.hidden) finish() }
    const motion = () => { if (preference.matches) finish() }
    if (!animate || completed.current || preference.matches || document.hidden) finish()
    else reveal = revealReply(message.text, write, completeReply)
    document.addEventListener('visibilitychange', visibility)
    preference.addEventListener('change', motion)
    return () => { reveal?.cancel(); document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', motion) }
  }, [message.id, message.text, animate, onProgress, onComplete])
  // Source links add height once; continuous text updates never render the scene.
  useEffect(() => { if (complete) onProgress() }, [complete, onProgress])
  return <div className="tifa-bubble" data-tifa-revealing={!complete || undefined}>
    <p className={`whitespace-pre-wrap break-words ${compact ? 'text-[13px]' : 'text-[14px]'} leading-[1.65]`}><span ref={text}>{complete ? message.text : ''}</span>{!complete && <span aria-hidden="true" className="tifa-reply-caret" />}</p>
    {!complete && <button type="button" className="tifa-reveal-skip mt-1 min-h-11 font-mono text-[9px] text-zinc-500 underline underline-offset-4" onClick={() => finishRef.current()}>show full reply</button>}
    {complete && message.answer && message.answer.sources.length > 0 && <div className="reply-links-enter mt-2 flex flex-wrap gap-x-4 gap-y-1">{message.answer.sources.map((source, i) => <button type="button" key={`${source.label}-${i}`} onClick={() => onSource(source)} className="inline-flex min-h-11 items-center gap-1 text-[11px] text-zinc-500 underline decoration-zinc-300 underline-offset-4 active:scale-[.98]">{source.label}<ArrowUpRight size={12} /></button>)}</div>}
  </div>
})
