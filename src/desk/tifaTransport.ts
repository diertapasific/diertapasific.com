import type { TifaAnswer } from './tifaAnswers'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export class TifaServiceError extends Error {
  constructor(public code: string, public retryAfter?: number) { super(code) }
}

export async function requestTifa(endpoint: string, messages: ChatTurn[], signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<TifaAnswer & { source: 'groq' | 'profile' }> {
  if (!endpoint) throw new TifaServiceError('setup_required')
  const response = await fetcher(endpoint, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, profileReplies: true }) })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const seconds = Number(data?.retryAfter || response.headers.get('Retry-After'))
    throw new TifaServiceError(typeof data?.error === 'string' ? data.error : data?.error?.code === 'model_not_found' ? 'model_unavailable' : 'provider_unavailable', Number.isFinite(seconds) && seconds > 0 ? Math.min(86400, Math.ceil(seconds)) : undefined)
  }
  if (!['groq', 'profile'].includes(data?.source) || data?.profileVersion !== 2 || typeof data?.reply !== 'string' || !data.reply.trim() || data.reply.length > 2000 || !data.answer || !Array.isArray(data.answer.sources) || !Array.isArray(data.answer.followups)) throw new TifaServiceError('invalid_response')
  const destinations = new Set(['about', 'projects', 'reading', 'music', 'writing', 'contact'])
  const sources = data.answer.sources.filter((source: Record<string, unknown>) => source && typeof source.label === 'string' && destinations.has(String(source.destination)) && (!source.section || ['intro', 'experience', 'education'].includes(String(source.section))) && (!source.projectId || ['01', '02', '03', '04', '08'].includes(String(source.projectId))) && (!source.articleId || ['01', '02', '03', '04'].includes(String(source.articleId)) && source.articleId === source.projectId)).slice(0, 4)
  return { source: data.source, text: data.reply, topic: typeof data.answer.topic === 'string' ? data.answer.topic : null, sources, followups: data.answer.followups.filter((question: unknown) => typeof question === 'string' && question.length <= 120).slice(0, 2) }
}

export function tifaUnavailableMessage(code: string) {
  if (code === 'rate_limited') return 'AI usage limit reached · showing saved profile notes. Please try again later.'
  if (code === 'timeout') return 'AI took too long · showing saved profile notes.'
  if (code === 'invalid_response') return 'AI reply couldn’t be read · showing saved profile notes.'
  if (code === 'connection_interrupted') return 'AI connection was interrupted · showing saved profile notes.'
  if (['setup_required', 'credentials_unavailable', 'model_unavailable'].includes(code)) return 'AI connection needs attention · showing saved profile notes.'
  return 'AI is temporarily unavailable · showing saved profile notes.'
}
