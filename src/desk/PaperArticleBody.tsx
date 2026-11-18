'use client'

import { memo } from 'react'
import { MarkdownDocument } from './MarkdownDocument'
import { findMediumArticle } from './mediumArticles'

export default memo(function PaperArticleBody({ url, title, preview }: { url: string; title: string; preview: string }) {
  const article = findMediumArticle(url)
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\byour\b/g, '').replace(/\s+/g, ' ').trim()
  const printedTitle = normalize(title), firstHeading = normalize(article?.firstHeading || '')
  const duplicateTitle = firstHeading === printedTitle || firstHeading.startsWith(printedTitle + ' ')
  return <div data-article-ready="true" className="mt-6">
    {article ? <MarkdownDocument html={duplicateTitle ? article.bodyHtml : article.html} /> : <>
      <p className="text-sm leading-relaxed text-zinc-600">{preview}</p>
      <p className="mt-4 text-xs text-zinc-500">The full text hasn’t been added to this paper yet.</p>
    </>}
  </div>
})
