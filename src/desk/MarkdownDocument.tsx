'use client'

import { memo, useRef } from 'react'

// HTML is compiled and sanitized from the checked-in Medium editions at build
// time. Visitors never wait for a Markdown parser or another article download.
export const MarkdownDocument = memo(function MarkdownDocument({ html }: { html: string }) {
  const root = useRef<HTMLDivElement>(null)
  return <div ref={root} className="monitor-document" dangerouslySetInnerHTML={{ __html: html }} onClick={event => {
    const href = (event.target as Element).closest('a')?.getAttribute('href')
    if (!href?.startsWith('#')) return
    event.preventDefault()
    const slug = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-')
    let fragment: string
    try { fragment = decodeURIComponent(href.slice(1)) } catch { return }
    const target = Array.from(root.current?.querySelectorAll('h1,h2,h3,h4') || []).find(heading => slug(heading.textContent || '') === fragment)
    target?.scrollIntoView({ block: 'start' })
  }} />
})
