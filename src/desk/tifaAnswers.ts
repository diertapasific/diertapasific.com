import { profileReply } from '../../server/tifaConversation.mjs'
export type TifaSource = { label: string; destination: 'projects' | 'about' | 'reading' | 'music' | 'writing' | 'contact'; section?: 'intro' | 'experience' | 'education'; projectId?: string; articleId?: string }
export type TifaNote = { id: string; terms: string[]; answer: string; detail?: string; sources: TifaSource[]; followups?: string[] }
export type TifaAnswer = { text: string; topic: string | null; sources: TifaSource[]; followups: string[] }

export const normalizeQuestion = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const contains = (text: string, term: string) => ` ${text} `.includes(` ${normalizeQuestion(term)} `)
const followup = (q: string) => /^(since when|how long|tell me more|more|go on|and then|what else|how does it work|what about it|what did he learn|what has he learnt|what tech does it use|what stack does it use|how did he build it)( about (it|that|this))?$/.test(q)
const contact: TifaSource = { label: 'ask Dipa directly', destination: 'contact' }

export function answerTifa(question: string, notes: TifaNote[], previousTopic: string | null = null): TifaAnswer {
  const known = profileReply([{ role: 'user', content: question }], notes, previousTopic)
  if (known) return known
  const q = normalizeQuestion(question.slice(0, 500))
  const result = (note: TifaNote, more = false): TifaAnswer => ({ text: more && note.detail ? note.detail : note.answer, topic: note.id, sources: note.sources, followups: note.followups ?? ['Tell me more', 'Show me his projects'] })
  // These details are intentionally absent from the public profile.
  if (/\b(salary|gpa|phone|birthday|age|password|secret|married|single|dating|revenue|valuation)\b|home address|street address|date of birth|api key/.test(q)) return {
    text: "I don’t have that detail in Dipa’s profile. You can ask Dipa directly through his contact card.", topic: null, sources: [contact], followups: ['How can I contact him?', 'What does he do?'],
  }
  if (!q || /^(hi|hello|hey|hiya|halo|hai|thanks|thank you)( tifa)?$/.test(q)) return {
    text: "Hi, I’m Tifa, Dipa’s little desk companion. I can help you explore his work, projects, reading notes, and the stories on this desk. What would you like to know?",
    topic: null, sources: [], followups: ['What does Dipa do?', 'Show me his projects', 'What has he been reading?'],
  }
  // Specific project/book/company names outrank broad words such as “work”.
  const ranked = notes.map((note, index) => {
    let score = 0
    for (const term of note.terms) if (contains(q, term)) score += normalizeQuestion(term).split(' ').length * 3 + (note.id.startsWith('project:') || note.id.startsWith('book:') ? 30 : 0)
    if (note.id === 'tifa' && /\b(tifa|dog|yorkie|yorkshire)\b/.test(q)) score += 30
    if (note.id === 'projects' && /\b(project|projects)\b/.test(q)) score += 12
    if (note.id === 'experience' && contains(q, 'experience')) score += 8
    if (note.id === 'current-work' && score > 0 && /\b(now|current|currently|latest)\b/.test(q)) score += 8
    return { note, score, index }
  }).filter(item => item.score > 0).sort((a,b) => b.score-a.score || a.index-b.index)
  const previous = notes.find(note => note.id === previousTopic)
  if (previous && followup(q)) return result(previous, true)
  if (ranked[0]) return result(ranked[0].note, /how|learn|lesson|takeaway|technical|build notes|more/.test(q))
  return {
    text: "I don’t have that in Dipa’s notes. I can help with his work and projects, or you can ask Dipa directly through his contact card.", topic: null, sources: [contact],
    followups: ['What does Dipa do?', 'Show me his projects', 'What has he been reading?'],
  }
}
