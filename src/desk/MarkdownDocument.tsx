'use client'

import { memo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function withoutEmoji(text: string) {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/(\*\*|__)([^\n]+?)\1/g, (_, marker: string, content: string) => `${marker}${content.trim()}${marker}`)
}

export const MarkdownDocument = memo(function MarkdownDocument({ markdown }: { markdown: string }) {
  const root = useRef<HTMLDivElement>(null)
  return <div ref={root} className="monitor-document">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      img: () => null,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
        if (!href) return
        if (href.startsWith('#')) {
          event.preventDefault()
          const slug = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-')
          const target = Array.from(root.current?.querySelectorAll('h1,h2,h3,h4') || []).find(heading => slug(heading.textContent || '') === decodeURIComponent(href.slice(1)))
          target?.scrollIntoView({ block: 'start' })
        }
      }}>{children}</a>,
      table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
    }}>{withoutEmoji(markdown)}</ReactMarkdown>
  </div>
})
