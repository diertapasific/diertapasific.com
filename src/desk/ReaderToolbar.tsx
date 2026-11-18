'use client'

import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react'

export function ReaderToolbar({ label, source, onBack }: { label: string; source: string; onBack: () => void }) {
  return <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 border-b border-zinc-300 px-4 font-mono text-[10px]">
    <button onClick={onBack} className="flex min-h-11 items-center gap-2 active:scale-[.98]"><ArrowLeft size={14} />back to project</button>
    <span className="hidden text-zinc-500 sm:inline">{label}</span>
    <a href={source} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-1.5 text-zinc-500 underline underline-offset-4" aria-label={`Open original ${label} in a new tab`}>original<ArrowUpRight size={13} /></a>
  </header>
}
