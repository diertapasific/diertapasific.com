export const normalizeTifaQuestion = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const contains = (text, term) => ` ${text} `.includes(` ${normalizeTifaQuestion(term)} `)
const privateDetail = q => /\b(salary|gpa|birthday|age|password|secret|phone)\b|how old|years old|api key|home address/.test(q)
const followup = q => /^(since when|how long|when did (he|dipa|it|that)|when was that|tell me more|more|go on|what about (it|that)|and then)(\b|$)/.test(q)
export function isTifaIntroduction(question) {
  const q = normalizeTifaQuestion(question)
  if (privateDetail(q)) return false
  if (/^(who are you|who is tifa|whats your name|what is your name|what are you|what can you do|what do you do|how can you help)( here| on this site| tifa| for me)?$/.test(q)) return true
  return /\b(dog|yorkie|yorkshire|terrier)\b/.test(q) && /\b(are you|youre|you are|is tifa|heard|does dipa have)\b/.test(q)
}
function topic(question, notes) {
  const q = normalizeTifaQuestion(question)
  if (isTifaIntroduction(q) && notes.some(note => note.id === 'tifa')) return 'tifa'
  const broad = new Set(['work', 'job', 'company', 'previous', 'book', 'books', 'project', 'projects', 'reading', 'education'])
  const ranked = notes.map((note, order) => ({ id: note.id, order, score: (note.terms || []).reduce((sum, term) => sum + (contains(q, term) ? (broad.has(normalizeTifaQuestion(term)) ? 1 : 3) + (/^(project|book):/.test(note.id) ? 20 : 0) : 0), 0) })).filter(item => item.score > 0).sort((a,b) => b.score-a.score || a.order-b.order)
  return ranked[0]?.id || null
}
export function resolveTifaFocus(messages, notes, previousTopic = null) {
  const current = messages.at(-1)?.content || '', q = normalizeTifaQuestion(current), direct = topic(current, notes)
  // A project follow-up like ‘how does it work?’ is not a new employment topic.
  const indirectWork = direct === 'current-work' && /\b(it|its|this|that)\b/.test(q) && !/\b(dipa|job|company|staffinc|currently|current|employer|role|career|mcp|agentic|harness)\b/.test(q)
  if (direct && !indirectWork) return direct
  if (!followup(q) && !indirectWork) return null
  if (previousTopic && notes.some(note => note.id === previousTopic)) return previousTopic
  for (const message of messages.slice(0,-1).reverse()) {
    if (message.role !== 'user') continue
    const selected = topic(message.content, notes)
    if (selected) return selected
    if (!followup(normalizeTifaQuestion(message.content))) break
  }
  return null
}
export function profileReply(messages, notes, previousTopic = null) {
  const question = messages.at(-1)?.content || '', q = normalizeTifaQuestion(question)
  if (!q || privateDetail(q)) return null
  const self = notes.find(note => note.id === 'tifa'), work = notes.find(note => note.id === 'current-work'), contact = notes.find(note => note.id === 'contact')
  const answer = (note, text = note.answer, sources = note.sources || []) => ({ text, topic: note.id, sources, followups: note.followups || [] })
  if (self && (isTifaIntroduction(q) || /^(hi|hello|hey|hiya|halo|hai)( tifa)?$/.test(q))) return answer(self)
  if (self && /^(thanks|thank you)( tifa)?$/.test(q)) return answer(self, 'You’re welcome. Feel free to explore the rest of Dipa’s desk.')
  const focus = resolveTifaFocus(messages, notes, previousTopic)
  if (work && focus === 'current-work' && /^(since when|how long|when did|when has|when did he start)/.test(q)) {
    const since = work.answer.match(/\bsince\s+([A-Za-z]+\s+\d{4})/i)
    if (since) return answer(work, `Dipa has been in his current role since ${since[1]}.`)
  }
  if (work && q.split(' ').length <= 10 && !/\b(mcp|harness|prompt|architecture|implementation)\b/.test(q) && /^(where (do you|does (dipa|he)) work|what (is|s) (your|his|dipas) (job|role)|what does (dipa|he) do|where (are you|is dipa|is he) working)(\b|$)/.test(q)) return answer(work)
  const business = /\b(hire|hiring|recruit|recruiting|collaborate|collaboration)\b/.test(q) || /\b(automation|agentic)\b/.test(q) && /\b(platform|workflow|system)\b/.test(q) && /\b(company|business|team|usecase|use case|our|my)\b/.test(q)
  if (work && contact && business) return answer(work, `${work.answer} You can ask Dipa directly about your use case or hiring plans; I don’t have his current availability.`, [...(work.sources || []), { label: 'ask Dipa directly', destination: 'contact' }])
  return null
}
