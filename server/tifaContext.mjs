import { resolveTifaFocus } from './tifaConversation.mjs'
export const MAX_ARTICLE_CHARS = 10000
export const MAX_NOTE_CHARS = 6500
const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const contains = (text, term) => ` ${text} `.includes(` ${normalize(term)} `)
const stop = new Set('a an the is are was were what which how why does did do can could would should me you he his him dipa dierta pasific about tell more and or of for in on to with it this that use used using work works project article please'.split(' '))
const equivalents = { photo: 'image', photos: 'image', picture: 'image', pictures: 'image', images: 'image', models: 'model', trained: 'train', training: 'train', prompts: 'prompt', prompting: 'prompt', formatted: 'format', formats: 'format', formatting: 'format', flashcards: 'flashcard', summaries: 'summary', summarization: 'summary' }
const words = text => [...new Set(normalize(text).split(' ').filter(word => word.length > 2 && !stop.has(word)).map(word => equivalents[word] || word))]
const overlap = (a, b) => {
  const left = words(a), right = new Set(words(b))
  return left.length ? left.filter(word => right.has(word)).length / left.length : 0
}
const clean = markdown => markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim()
const indexes = new WeakMap()
function articleIndex(articles) {
  if (!indexes.has(articles)) indexes.set(articles, articles.map(article => ({ ...article, text: clean(article.markdown) })))
  return indexes.get(articles)
}
const metadataNote = article => ({ id: `article:${article.id}`, answer: `Medium article: ${article.title}. Published ${article.publishedAt.slice(0, 10)}.`, sources: article.sources, followups: article.followups })

export function selectTifaContext(messages, notes, articles = []) {
  const question = messages.at(-1).content, q = normalize(question)
  const index = articleIndex(articles)
  const named = text => index.filter(article => article.terms.some(term => contains(normalize(text), term)))
  const ranked = notes.map((note, order) => ({ note, order, score: (note.terms || []).reduce((score, term) => score + (contains(q, term) ? normalize(term).split(' ').length * 3 + (/^(project|book):/.test(note.id) ? 20 : 0) : 0), 0) })).sort((a, b) => b.score - a.score || a.order - b.order)
  const focus = resolveTifaFocus(messages, notes), focusedNote = notes.find(note => note.id === focus)
  let relevant = named(question)
  if (!relevant.length && focus?.startsWith('project:')) relevant = index.filter(article => `project:${article.id}` === focus)
  const explicitProject = ranked.find(({ note, score }) => score > 0 && note.id.startsWith('project:'))
  const missingArticle = explicitProject && !index.some(article => `project:${article.id}` === explicitProject.note.id)
  const profileTopic = Boolean(focusedNote && /^(book:|education$|experience$|current-work$|contact$|reading$|music$|tifa$)/.test(focus)) || ranked.some(({ note, score }) => score > 0 && (note.id !== 'current-work' || /\b(dipa|job|company|staffinc|currently|current|employer|role|career)\b/.test(q)) && /^(book:|education$|experience$|current-work$|contact$|reading$|music$|tifa$)/.test(note.id))
  if (!relevant.length && !profileTopic && !missingArticle && /\b(it|that|this|more|model|architecture|technical|what|which|how|why|stack|lesson|prompt|cache|training)\b/i.test(q)) {
    for (const message of messages.slice(0, -1).reverse()) {
      if (message.role !== 'user') continue
      relevant = named(message.content)
      if (relevant.length) break
      if (notes.some(note => /^(book:|education$|experience$|current-work$|contact$|reading$|music$|tifa$)/.test(note.id) && (note.terms || []).some(term => contains(normalize(message.content), term)))) break
    }
  }
  if (!relevant.length && !profileTopic && !missingArticle) {
    const terms = words(question)
    const matches = index.map(article => ({ article, score: terms.filter(term => contains(normalize(article.text), term)).length }))
      .filter(item => item.score >= Math.min(2, Math.max(1, terms.length))).sort((a, b) => b.score - a.score)
    relevant = matches.slice(0, 2).map(item => item.article)
  }
  relevant = relevant.slice(0, 2)
  const selected = [], seen = new Set()
  let noteChars = 0
  const add = note => {
    if (!note || seen.has(note.id)) return
    const length = note.answer.length + (note.detail?.length || 0)
    if (noteChars + length > MAX_NOTE_CHARS) return
    noteChars += length; seen.add(note.id); selected.push(note)
  }
  for (const id of ['tifa', 'about', 'current-work', 'contact']) add(notes.find(note => note.id === id))
  add(focusedNote)
  for (const article of relevant) {
    add(notes.find(note => note.id === `project:${article.id}`))
    add(metadataNote(article))
  }
  for (const { note, score } of ranked) if (score > 0) add(note)
  if (!ranked.some(item => item.score > 0) && !relevant.length) add(notes.find(note => note.id === 'projects'))
  if (!selected.length) notes.slice(0, 3).forEach(add)
  const excerpts = []
  let remaining = MAX_ARTICLE_CHARS
  for (const [i, article] of relevant.entries()) {
    const budget = Math.floor(remaining / (relevant.length - i))
    let text = article.text
    if (text.length > budget) {
      const terms = words(question)
      const chunks = text.split(/\n\n+/).flatMap(part => part.match(/[\s\S]{1,1800}/g) || []).map((part, order) => ({ part, order, score: terms.filter(term => contains(normalize(part), term)).length }))
      const chosen = []; let length = 0
      for (const chunk of [...chunks].sort((a, b) => b.score - a.score || a.order - b.order)) {
        if (length + chunk.part.length + 2 > budget) continue
        chosen.push(chunk); length += chunk.part.length + 2
      }
      text = chosen.sort((a, b) => a.order - b.order).map(chunk => chunk.part).join('\n\n')
    }
    remaining -= text.length
    excerpts.push({ sourceId: `article:${article.id}`, title: article.title, publishedAt: article.publishedAt, text })
  }
  return { notes: selected, articles: excerpts, focus }
}

export function compactTifaHistory(messages) {
  return messages.slice(-7).map(message => ({ ...message, content: message.content.slice(0, message.role === 'assistant' ? 700 : 500) }))
}

const genericQuestions = ['What does Dipa do?', 'Show me his projects', 'What has he been reading?']
export function suggestQuestions(sourceIds, notes, messages = []) {
  const asked = messages.filter(message => message.role === 'user').map(message => message.content)
  const relatedIds = [...sourceIds, ...sourceIds.filter(id => id.startsWith('project:')).map(id => id.replace('project:', 'article:'))]
  const selected = [...new Set(relatedIds)].map(id => notes.find(note => note.id === id)).filter(Boolean).sort((a, b) => Number(b.id.startsWith('article:')) - Number(a.id.startsWith('article:')))
  const candidates = [...selected.flatMap(note => note.followups || []), ...genericQuestions]
  const seen = new Set()
  return candidates.filter(question => {
    const key = normalize(question)
    if (seen.has(key) || question.length > 64 || /^(would you|do you|are you|want to)/i.test(question)) return false
    seen.add(key)
    return !asked.some(previous => normalize(previous) === key || overlap(question, previous) >= .8)
  }).slice(0, 2)
}
