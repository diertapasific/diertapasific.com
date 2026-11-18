'use client'

import { memo } from 'react'
import { MarkdownDocument } from './MarkdownDocument'
import { findMediumArticle } from './mediumArticles'

export default memo(function PaperArticleBody({ url, title, preview }: { url: string; title: string; preview: string }) {
  const article = findMediumArticle(url)
  let markdown = article?.markdown || ''
  const firstHeading = markdown.match(/^#{1,6}\s+([^\n]+)\n+/)
  if (firstHeading) {
    const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\byour\b/g, '').replace(/\s+/g, ' ').trim()
    const printedTitle = normalize(title), heading = normalize(firstHeading[1])
    // The paper already prints its title. Keep subtitles, but avoid printing
    // the same headline twice when it is also the first line of the source.
    if (heading === printedTitle || heading.startsWith(printedTitle + ' ')) markdown = markdown.slice(firstHeading[0].length)
  }
  return <div data-article-ready="true" className="mt-6">
    {article ? <MarkdownDocument markdown={markdown} /> : <>
      <p className="text-sm leading-relaxed text-zinc-600">{preview}</p>
      <p className="mt-4 text-xs text-zinc-500">The full text hasn’t been added to this paper yet.</p>
    </>}
  </div>
})
