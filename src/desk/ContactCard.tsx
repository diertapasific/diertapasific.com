'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ArrowsClockwise, Check, Copy, EnvelopeSimple, GithubLogo, LinkedinLogo, MapPin } from '@phosphor-icons/react'
import { contact } from './contact'

const socialProfiles = [
  { label: 'LinkedIn', href: contact.linkedin, Icon: LinkedinLogo },
  { label: 'GitHub', href: contact.github, Icon: GithubLogo },
] as const

function BadgeMark() {
  const bars = [1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2]
  let x = 0
  return <svg aria-hidden="true" viewBox="0 0 50 14" className="h-3 w-11 text-zinc-500">{bars.map((width, index) => { const left = x; x += width + 2; return <rect key={index} x={left} y={0} width={width} height={index % 4 === 0 ? 14 : 11} fill="currentColor" /> })}</svg>
}

export function ContactCard({ dark, back, enabled, turning, onFlip, width, height }: {
  dark: boolean; back: boolean; enabled: boolean; turning: boolean; onFlip: () => void; width: number; height: number;
}) {
  const root = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false), [error, setError] = useState('')
  const small = height < 300, portraitHeight = Math.max(66, Math.min(210, height - 145))
  useEffect(() => {
    if (!root.current) return
    root.current.inert = !enabled
    if (enabled) root.current.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
  }, [enabled])
  async function copy() {
    try { await navigator.clipboard.writeText(contact.email); setCopied(true); setError('') }
    catch { setError('Select the email address to copy it.') }
  }
  return <div ref={root} data-object-surface="contact" data-theme={dark ? 'dark' : 'light'} data-contact-face={back ? 'back' : 'front'} aria-hidden={!enabled || undefined}
    className={`contact-card object-surface flex flex-col bg-[#f8f8f8] text-[#2a2a2a] ${small ? 'contact-card-small' : ''}`}
    style={{ width, height, pointerEvents: enabled ? 'auto' : 'none' }}>
    <header className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-300 px-3"><span className="text-[25px] font-medium leading-none tracking-[-.08em]">D.P<span className="text-zinc-400">.</span></span><span className="text-right font-mono text-[7px] uppercase leading-[1.45] tracking-[.12em]">personal<br />{back ? 'contact details' : 'identification'}</span></header>
    {back ? <div className={`contact-card-body grid min-h-0 flex-1 content-start overflow-y-auto px-3 ${small ? 'gap-1.5 py-2' : 'gap-2 py-3'}`}>
      <div><h2 tabIndex={-1} className={`${small ? 'text-[22px]' : 'text-[26px]'} leading-[1.03] tracking-[-.05em] outline-none`}>say hello.</h2>{!small && <p className="mt-1 text-[11px] leading-[1.4] text-zinc-500">Have an idea? Let's talk.</p>}</div>
      <div className="border border-zinc-300 bg-[#f1f1f1]/50">
        <div className="flex h-11 items-center justify-between gap-2 pl-2.5"><span className="flex items-center gap-2"><EnvelopeSimple size={20} aria-hidden="true" /><span className="font-mono text-[9px] uppercase tracking-[.06em]">Email</span></span>
          <button onClick={copy} aria-label={copied ? 'Email copied' : 'Copy email'} title={copied ? 'Email copied' : 'Copy email'} className="grid size-11 shrink-0 place-items-center border-l border-zinc-300 transition-colors hover:bg-zinc-200/40 active:scale-[.98]">{copied ? <Check size={17} /> : <Copy size={17} />}</button>
        </div>
        <a href={`mailto:${contact.email}`} className={`flex min-h-6 items-center justify-between gap-1.5 px-2.5 pb-2 ${small ? 'text-[12px]' : 'text-[13px]'} leading-[1.25] text-zinc-700`}><span className="min-w-0 break-all">{contact.email}</span><ArrowUpRight size={12} className="shrink-0" /></a>
      </div>
      <nav aria-label="Social profiles" className="grid grid-cols-2 gap-2">{socialProfiles.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Dipa on ${label} (opens in a new tab)`} className={`flex items-center justify-center border border-zinc-300 transition-colors hover:bg-zinc-200/40 active:scale-[.98] ${small ? 'min-h-12 gap-1.5 px-1.5 text-[11px]' : 'min-h-[52px] gap-2 px-2 text-[12px]'}`}><Icon size={small ? 18 : 22} aria-hidden="true" className="shrink-0" /><span>{label}</span></a>)}</nav>
      <p className={`flex items-center gap-1.5 font-mono ${small ? 'text-[9px]' : 'text-[10px]'} leading-none text-zinc-500`}><MapPin size={small ? 12 : 14} aria-hidden="true" className="shrink-0" />{contact.location}</p>
      {error && <p role="alert" className="text-[10px] leading-snug">{error}</p>}
      <span className="sr-only" role="status">{copied ? 'Email copied' : ''}</span>
    </div> : <div className="contact-card-body flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2">
      <div className="badge-portrait bg-[#f8f8f8] relative shrink-0 overflow-hidden border border-zinc-300" style={{ height: portraitHeight }}>
        <img data-id-portrait src={`${import.meta.env.BASE_URL}assets/desk/dipa-outline.png`} alt="Blueprint outline portrait of Dipa wearing glasses with his arms crossed" width={1024} height={1536} className="absolute inset-0 size-full object-contain object-bottom" decoding="async" />
        <span aria-hidden="true" className="absolute bottom-1 right-1.5 font-mono text-[6px] text-zinc-400">D.P.</span>
      </div>
      <div className="shrink-0"><h2 tabIndex={-1} className={`${small ? 'text-[20px]' : 'text-[23px]'} leading-none tracking-[-.05em] outline-none`}>Dierta Pasific</h2><div className="mt-1.5 flex items-center justify-between gap-3"><p className="font-mono text-[8px] uppercase leading-none tracking-[.12em] text-zinc-500">Engineer</p><BadgeMark /></div></div>
    </div>}
    <button onClick={onFlip} disabled={turning} aria-label={back ? 'Flip ID to the front' : 'Flip ID for contact info'} className="group flex min-h-11 shrink-0 items-center justify-between gap-3 border-t border-zinc-300 px-3 text-left font-mono text-zinc-600 transition-colors hover:bg-zinc-200/30 active:scale-[.98] disabled:opacity-50">
      <span className="flex flex-col gap-0.5"><span className="text-[10px] uppercase leading-none tracking-[.05em]">{back ? 'Portrait' : 'Contact details'}</span><span className="text-[8px] leading-none text-zinc-400">{back ? 'flip to the front' : 'flip card to view'}</span></span>
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-[#343434] bg-[#343434] text-[#f6f6f6] transition-colors group-hover:border-[#484848] group-hover:bg-[#484848]"><ArrowsClockwise size={18} weight="regular" className="transition-transform duration-300 group-hover:rotate-12" /></span>
    </button>
  </div>
}
