'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { ArrowUpRight, PaperPlaneTilt, ArrowCounterClockwise } from '@phosphor-icons/react'
import type { TifaConversation as Conversation } from './useTifaChat'
import type { TifaSource } from './tifaAnswers'
import { tifaLayout } from './tifaView'
import { TifaPortrait } from './TifaPortrait'

const prompts=[['work','What does Dipa do?'],['projects','Show me his projects'],['reading','What has he been reading?']] as const

export function TifaConversation({ open, chat, surface, onSource, fallback = false }: { open: boolean; chat: Conversation; surface: RefObject<HTMLDivElement>; onSource: (source: TifaSource) => void; fallback?: boolean }) {
  const [size,setSize]=useState({width:window.innerWidth,height:window.innerHeight})
  const [draft,setDraft]=useState('')
  const scroll=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null)
  const layout=tifaLayout(size.width,size.height),compact=layout.mobile
  const started=chat.messages.length>0
  const latest=[...chat.messages].reverse().find(message=>message.answer)?.answer
  useLayoutEffect(()=>{
    const node=surface.current
    if(!node)return
    const measure=()=>{const rect=node.getBoundingClientRect();setSize(previous=>previous.width===rect.width&&previous.height===rect.height?previous:{width:rect.width,height:rect.height})}
    measure();const observer=new ResizeObserver(measure);observer.observe(node)
    return()=>observer.disconnect()
  },[surface])
  useEffect(()=>{
    if(!open)return
    const timer=window.setTimeout(()=>heading.current?.focus({preventScroll:true}),700)
    return()=>window.clearTimeout(timer)
  },[open])
  useEffect(()=>{
    const node=scroll.current
    if(!open||!node)return
    if(!started){node.scrollTop=0;return}
    const replies=node.querySelectorAll<HTMLElement>('[data-tifa-message="tifa"]'),last=replies[replies.length-1]
    if(chat.messages[chat.messages.length-1]?.role==='tifa'&&last)node.scrollTop+=last.getBoundingClientRect().top-node.getBoundingClientRect().top-8
    else node.scrollTop=node.scrollHeight
  },[open,chat.messages,chat.replying,started])
  const send=(value:string)=>{if(!value.trim()||chat.replying)return;void chat.send(value);setDraft('')}
  const submit=(event:FormEvent)=>{event.preventDefault();send(draft)}
  const keepSuggestionsVisible=layout.chat.height>=300
  const followupQuestions=latest&&!chat.replying&&latest.followups.length>0?<nav aria-label="Suggested questions" className="grid shrink-0 grid-cols-2 gap-2 px-2 pt-2">
      {latest.followups.slice(0,2).map(question=><button type="button" key={question} onClick={()=>send(question)} className="flex min-h-11 min-w-0 items-center justify-between gap-2 border border-zinc-300 bg-[#f6f6f6] px-2.5 py-2 text-left text-[11px] leading-[1.45] text-zinc-600 active:scale-[.98]"><span className="min-w-0 break-words">{question}</span><ArrowUpRight size={12} aria-hidden="true" className="shrink-0" /></button>)}
    </nav>:null
  return <section aria-label="Chat with Tifa" hidden={!open} className={`tifa-conversation absolute z-[8] flex min-h-0 flex-col ${open?'is-open':''}`} style={{display:open?'flex':'none',left:layout.chat.left,top:layout.chat.top,width:layout.chat.width,height:layout.chat.height}}>
    <header className="flex min-h-9 shrink-0 items-center justify-between gap-3 px-2 pb-2">
      <div className="flex items-center gap-2">{fallback&&<TifaPortrait className="h-9 w-8 text-zinc-600" />}<h2 ref={heading} tabIndex={-1} className="text-[22px] tracking-[-.04em] outline-none">Tifa<span className="ml-3 font-mono text-[9px] tracking-normal text-zinc-500">your little desk guide</span></h2></div>
      {started&&<button type="button" aria-label="Start a new chat with Tifa" onClick={()=>{chat.clear();setDraft('')}} className="grid size-11 shrink-0 place-items-center text-zinc-500 active:scale-[.98]"><ArrowCounterClockwise size={15} /></button>}
    </header>
    <div ref={scroll} data-tifa-transcript className="surface-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-2">
      {!started?<div className="space-y-3">
        <div className="tifa-bubble"><p className={`${compact?'text-[14px]':'text-[17px]'} leading-[1.65]`}>Hi, I’m Tifa.<br />What would you like to know about Dipa?</p></div>
        <div className="flex flex-wrap gap-2 pl-1">{prompts.map(([label,question])=><button type="button" key={label} onClick={()=>send(question)} aria-label={question} className="min-h-11 border border-zinc-300 bg-[#f6f6f6] px-3 py-1.5 font-mono text-[10px] text-zinc-600 active:scale-[.98]">{label}<ArrowUpRight size={12} className="ml-2 inline" /></button>)}</div>
      </div>:<div className="space-y-4">{chat.messages.map(message=><article key={message.id} data-tifa-message={message.role} className={message.role==='user'?'ml-auto max-w-[90%]':'max-w-[96%]'}>
        <p className={`mb-1 px-2 font-mono text-[9px] text-zinc-500 ${message.role==='user'?'text-right':''}`}>{message.role==='user'?'you':message.source==='notes'?'Tifa · profile notes':'Tifa'}</p>
        <div className={message.role==='tifa'?'tifa-bubble':'tifa-user-bubble'}><p className={`whitespace-pre-wrap break-words ${compact?'text-[13px]':'text-[14px]'} leading-[1.65]`}>{message.text}</p>
          {message.answer&&message.answer.sources.length>0&&<div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">{message.answer.sources.map((source,i)=><button type="button" key={`${source.label}-${i}`} onClick={()=>onSource(source)} className="inline-flex min-h-11 items-center gap-1 text-[11px] text-zinc-500 underline decoration-zinc-300 underline-offset-4 active:scale-[.98]">{source.label}<ArrowUpRight size={12} /></button>)}</div>}
        </div>
      </article>)}
        {chat.replying&&<div role="status" className="tifa-bubble space-y-2"><span className="sr-only">Tifa is checking Dipa’s notes.</span><div className="h-2.5 w-4/5 animate-pulse bg-zinc-200" /><div className="h-2.5 w-3/5 animate-pulse bg-zinc-200" /></div>}
        {!keepSuggestionsVisible&&followupQuestions}
      </div>}
    </div>
    {keepSuggestionsVisible&&followupQuestions}
    {chat.error&&<div role="status" className="flex shrink-0 items-center justify-between gap-3 px-2 py-1 text-[11px]"><p>{chat.error}</p><button type="button" disabled={chat.replying} onClick={()=>void chat.retry()} className="min-h-11 shrink-0 underline underline-offset-4 disabled:opacity-40">retry AI</button></div>}
    <form onSubmit={submit} className="shrink-0 px-2 pt-2">
      <label htmlFor="tifa-question" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[.06em] text-zinc-500">ask Tifa about Dipa</label>
      <div className="flex min-h-11 items-center gap-2 border border-zinc-400 bg-[#f6f6f6] pl-3 focus-within:border-zinc-600">
        <input id="tifa-question" name="question" autoComplete="off" maxLength={500} value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.nativeEvent.isComposing&&event.key==='Enter')event.preventDefault()}} placeholder="What would you like to know?" aria-describedby="tifa-helper" className={`min-w-0 flex-1 bg-transparent py-2 leading-relaxed outline-none placeholder:text-zinc-400 ${compact?'text-[16px]':'text-[14px]'}`} />
        <button type="submit" disabled={!draft.trim()||chat.replying} aria-label="Send message to Tifa" className="grid size-11 shrink-0 place-items-center bg-[#343434] text-[#f6f6f6] active:scale-[.98] disabled:opacity-30"><PaperPlaneTilt size={17} /></button>
      </div>
      <p id="tifa-helper" className={size.height<480?'sr-only':'mt-1.5 font-mono text-[9px] text-zinc-400'}>{chat.mode==='groq'?'AI answers from Dipa’s profile.':'Ask about his work, projects, or reading.'}</p>
    </form>
    <span className="sr-only" role="status">{chat.replying?'Tifa is checking the notes.':chat.messages[chat.messages.length-1]?.role==='tifa'?'Tifa has replied.':''}</span>
  </section>
}
