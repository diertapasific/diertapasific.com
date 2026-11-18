'use client'

import { useEffect, useRef } from 'react'
import { mediumArticles } from './mediumArticles'
import { MarkdownDocument } from './MarkdownDocument'
import { ReaderToolbar } from './ReaderToolbar'

export function ArticleReader({ projectId, projectName, onBack }: { projectId: string; projectName: string; onBack: () => void }) {
  const article = mediumArticles[projectId]
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [projectId])
  if (!article) return <div className="p-6"><h3 tabIndex={-1} className="text-xl">No article added yet.</h3><button onClick={onBack} className="mt-4 min-h-11 text-sm underline">back to project</button></div>
  const date = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(article.publishedAt))
  return <section aria-label={`${projectName} article`} className="flex h-full min-h-0 flex-col">
    <ReaderToolbar label="Medium article" source={article.url} onBack={onBack} />
    <div className="surface-scroll min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
      <article className="mx-auto max-w-[65ch]">
        <p className="eyebrow">from my Medium / text edition</p>
        <h3 ref={title} tabIndex={-1} className="mt-4 text-[28px] leading-tight tracking-[-.04em] outline-none">{article.title}</h3>
        <p className="mb-7 mt-3 border-b border-zinc-300 pb-5 font-mono text-[10px] text-zinc-500">{article.author} / {date}</p>
        <MarkdownDocument markdown={article.markdown} />
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center border-t border-zinc-300 pt-3 font-mono text-[10px] text-zinc-500 underline underline-offset-4">original article on Medium</a>
      </article>
    </div>
  </section>
}
