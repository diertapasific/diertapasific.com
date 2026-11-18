'use client'

import { useState } from 'react'
import { TurningBook } from './TurningBook'
import { BookInscription } from './ObjectSurface'
import { getReadingBook, readingPages } from './books'
import type { ReadingBookId } from './books'

const label = (id: ReadingBookId) => getReadingBook(id).title
const inscription = (id: ReadingBookId, preview: boolean) => <BookInscription destination="reading" book={id} preview={preview} />
const marked: Record<ReadingBookId, string[]> = {
  'atomic-habits': ['small things can have a big impact', 'consistently', 'making my bed'],
  'psychology-of-money': ['how I behave with it', 'Everyone sees money differently', 'completely normal to someone else'],
  'let-them-theory': ['what I can control', 'how I react and how I behave', 'people will have their own opinions'],
}

function annotated(note: string, phrases: string[]) {
  const matches = phrases.filter(phrase => note.includes(phrase))
  if (!matches.length) return note
  return note.split(new RegExp(`(${matches.join('|')})`, 'g')).map((part, i) => matches.includes(part)
    ? <span key={i} className="border-b border-[#8b8b8b] bg-[#e9e9e9] text-zinc-800">{part}</span> : part)
}

const notes = (id: ReadingBookId) => <div className="relative">
  <div className="mb-6 flex items-center justify-between gap-3 border-b border-zinc-300 pb-3"><p className="eyebrow !text-[8px]">notes in the margins</p><span className="font-mono text-[9px] text-zinc-400">D.P.</span></div>
  <div className="space-y-6">{getReadingBook(id).notes.map((note, i) => <div key={note} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
    <span aria-hidden="true" className="border-t border-zinc-400 pt-1 font-mono text-[8px] text-zinc-400">{String(i + 1).padStart(2, '0')}</span>
    <p className="border-l border-zinc-200 pl-3 text-[14px] leading-[1.85] text-zinc-600">{annotated(note, marked[id])}</p>
  </div>)}</div>
  <p className="mt-7 border-t border-zinc-300 pt-3 font-mono text-[8px] uppercase tracking-[.08em] text-zinc-400">my copy. my takeaways.</p>
</div>

export function ReadingBook({ reducedMotion }: { reducedMotion: boolean }) {
  const [book, setBook] = useState<ReadingBookId>('atomic-habits')
  return <TurningBook destination="reading" section={book} onSection={setBook} reducedMotion={reducedMotion} pages={readingPages} pageLabel={label} header="THE BOOKSHELF / READING NOTES" renderContent={notes} renderInscription={inscription} />
}
