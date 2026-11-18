'use client'

import { memo } from 'react'
import { Monitor, Notebook, Books, SpeakerHigh, Article, IdentificationBadge } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { deskDestinations } from './model'
import type { Destination } from './model'

const objects: Record<Destination, Icon> = {
  projects: Monitor,
  about: Notebook,
  reading: Books,
  music: SpeakerHigh,
  writing: Article,
  contact: IdentificationBadge,
}

export const DeskNavigation = memo(function DeskNavigation({ selected, disabled, onSelect }: {
  selected: Destination | null
  disabled: boolean
  onSelect: (destination: Destination) => void
}) {
  return <nav aria-label="Desk destinations" className="desk-dock pointer-events-auto mx-auto grid w-full max-w-[580px] grid-cols-5 gap-0.5 rounded-[14px] border border-[#cecece] bg-[#f6f6f6] p-1 sm:gap-1 sm:p-1.5">
    {deskDestinations.map(item => {
      const ObjectIcon = objects[item.id]
      const active = selected === item.id
      return <button key={item.id} type="button" disabled={disabled} data-destination={item.id}
        aria-label={item.label} title={active ? 'Back to desk' : `Explore ${item.label}`} aria-describedby={active ? 'desk-dock-dismiss' : undefined} aria-current={active ? 'page' : undefined} aria-keyshortcuts={String(Number(item.number))}
        onClick={() => onSelect(item.id)}
        className={`desk-dock-button group relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-[9px] px-0.5 text-zinc-600 sm:min-h-16 sm:px-2 ${active ? 'is-active' : ''}`}>
        <span aria-hidden="true" className="desk-dock-shortcut absolute right-1.5 top-1 hidden font-mono text-[8px] leading-none text-zinc-400 sm:block">{item.number}</span>
        <ObjectIcon aria-hidden="true" size={24} weight="light" className="desk-dock-icon shrink-0" />
        <span className="whitespace-nowrap text-[10px] leading-none tracking-[-.025em] sm:text-[12px]">{item.label}</span>
      </button>
    })}
    <span id="desk-dock-dismiss" className="sr-only">Select the current section again to return to the desk.</span>
  </nav>
})
