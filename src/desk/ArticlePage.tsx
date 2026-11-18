'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { ArrowUpRight } from '@phosphor-icons/react'
import { POSTS } from '../data/posts'
import PaperArticleBody from './PaperArticleBody'
import { ArticleReaderBoundary } from './ArticleReaderBoundary'

export function ArticlePage({ index, onSelect, elementRef, interactive, dark, width, height }: {
  dark: boolean; index: number; onSelect: (index: number) => void; elementRef: RefObject<HTMLDivElement>;
  interactive: boolean; width: number; height: number;
}) {
  const heading = useRef<HTMLHeadingElement>(null), sheetNav = useRef<HTMLElement>(null)
  const post = POSTS[index]
  useEffect(() => {
    if (elementRef.current) elementRef.current.inert = !interactive
    if (interactive) heading.current?.focus({ preventScroll: true })
  }, [interactive, elementRef, index])
  useEffect(() => {
    const nav = sheetNav.current, selected = nav?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (nav && selected) nav.scrollLeft = selected.offsetLeft - nav.offsetLeft - (nav.clientWidth - selected.offsetWidth) / 2
  }, [index, width])
  return <div ref={elementRef} data-theme={dark ? 'dark' : 'light'} data-object-surface={interactive ? 'writing' : undefined} data-article-index={index} aria-hidden={!interactive || undefined} className="writing-sheet flex flex-col overflow-hidden font-sans" style={{ width, height, touchAction: 'auto', pointerEvents: interactive ? 'auto' : 'none' }} onKeyDown={event => {
      if (!interactive) return
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (step && POSTS[index + step] && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); onSelect(index + step) }
    }}>
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-300 px-5 py-3 font-mono text-[9px] text-zinc-500"><span>NOTES FROM BUILDING</span><span>{String(index + 1).padStart(2, '0')} / {String(POSTS.length).padStart(2, '0')}</span></header>
      <article aria-label={post.title} className="surface-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-6">
        <p className="eyebrow">{post.date}</p>
        <h2 ref={heading} tabIndex={-1} className="mt-5 text-[27px] leading-[1.15] tracking-[-.035em] outline-none">{post.title}</h2>
        <ArticleReaderBoundary source={post.href}><PaperArticleBody url={post.href} title={post.title} preview={post.preview} /></ArticleReaderBoundary>
        <a href={post.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[12px] text-zinc-500 underline decoration-zinc-400 underline-offset-4 active:scale-[.98]">original on Medium<ArrowUpRight size={14} /></a>
        <p className="mt-7 border-t border-zinc-200 pt-4 font-mono text-[9px] text-zinc-400">DIERTA PASIFIC / MEDIUM</p>
      </article>
      <nav ref={sheetNav} aria-label="Choose an article sheet" className="grid shrink-0 grid-flow-col auto-cols-[minmax(44px,1fr)] gap-1 overflow-x-auto overscroll-x-contain border-t border-zinc-300 px-3 py-2" style={{ touchAction: 'pan-x', scrollbarWidth: 'thin' }}>{POSTS.map((item, i) => <button key={item.href} aria-label={`Article ${i + 1}: ${item.title}`} aria-pressed={index === i} onClick={() => onSelect(i)} className={`min-h-11 font-mono text-[10px] transition-colors active:scale-[.98] ${index === i ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-200'}`}>{String(i + 1).padStart(2, '0')}</button>)}</nav>
    </div>
}
