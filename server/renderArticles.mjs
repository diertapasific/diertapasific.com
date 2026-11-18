import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const clean = text => text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/(\*\*|__)([^\n]+?)\1/g, (_, marker, content) => `${marker}${content.trim()}${marker}`)
const render = markdown => renderToStaticMarkup(h(ReactMarkdown, { remarkPlugins: [remarkGfm], skipHtml: true, components: {
  img: () => null,
  a: ({ href, children }) => h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, children),
  table: ({ children }) => h('div', { className: 'overflow-x-auto' }, h('table', null, children)),
} }, clean(markdown)))

// Build from the checked-in editions only. Raw HTML is discarded and Markdown
// URLs pass through react-markdown's safe URL transform before being serialized.
export function renderArticles(editions) {
  return Object.fromEntries(Object.entries(editions).map(([id, { markdown, ...metadata }]) => {
    const first = markdown.match(/^#{1,6}\s+([^\n]+)\n+/)
    return [id, { ...metadata, firstHeading: first?.[1] || '', html: render(markdown), bodyHtml: render(first ? markdown.slice(first[0].length) : markdown) }]
  }))
}
