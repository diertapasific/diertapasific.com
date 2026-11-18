import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { renderArticles } from '../server/renderArticles.mjs'

const editions = JSON.parse(await readFile(new URL('../src/desk/data/medium-articles.json', import.meta.url)))
const compiled = renderArticles(editions)
test('all six full Medium editions are compiled before the reader opens', () => {
  assert.equal(Object.keys(compiled).length, 6)
  assert.match(compiled['01'].html, /The graveyard of half-watched courses is a solvable problem/)
  assert.match(compiled['02'].html, /The code is open-source/)
  assert.match(compiled['03'].html, /spaced repetition systems like Anki/)
  assert.match(compiled['04'].html, /keep creating, learning, and contributing/)
  assert.match(compiled.chatdp.html, /see AI in action/)
  assert.match(compiled['mobile-development'].html, /LinkedIn/)
  for (const [id, article] of Object.entries(compiled)) {
    assert.equal(article.url, editions[id].url)
    assert.equal('markdown' in article, false, 'the browser does not receive a Markdown source to parse')
    assert.ok(article.bodyHtml.length > 500)
  }
})
test('paper editions omit only the first heading while retaining the rest of the article', () => {
  const data = renderArticles({ example: { title: 'A title', author: 'Dipa', publishedAt: '2026-11-18', url: 'https://example.com/', markdown: '# A title\n\nOpening paragraph.\n\n## Later heading\n\nFinal paragraph.' } }).example
  assert.equal(data.firstHeading, 'A title')
  assert.match(data.html, /<h1>A title<\/h1>/)
  assert.doesNotMatch(data.bodyHtml, /<h1>/)
  assert.match(data.bodyHtml, /Opening paragraph/); assert.match(data.bodyHtml, /Later heading/); assert.match(data.bodyHtml, /Final paragraph/)
})
test('compiled articles discard raw HTML, tracking images and executable links', () => {
  const data = renderArticles({ example: { title: 'A title', author: 'Dipa', publishedAt: '2026-11-18', url: 'https://example.com/', markdown: '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n![tracking](https://example.com/pixel)\n\n[unsafe](javascript:alert(1))\n\n[safe](https://example.com/)\n\n`<script>`' } }).example
  assert.doesNotMatch(data.html, /<script|<img|onerror|href="javascript:/i)
  assert.match(data.html, /target="_blank" rel="noopener noreferrer"/)
  assert.match(data.html, /&lt;script&gt;/)
})
