'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { answerTifa } from './tifaAnswers'
import type { TifaAnswer } from './tifaAnswers'
import { tifaNotes } from './tifaKnowledge'
import { requestTifa, TifaServiceError, tifaUnavailableMessage } from './tifaTransport'
import type { ChatTurn } from './tifaTransport'

export type TifaMessage = { id: number; role: 'user' | 'tifa'; text: string; answer?: TifaAnswer; source?: 'groq' | 'notes' }
export type TifaConversation = ReturnType<typeof useTifaChat>
const endpoint = '/api/tifa'

export function useTifaChat() {
  const [messages, setMessages] = useState<TifaMessage[]>([])
  const [replying, setReplying] = useState(false), [error, setError] = useState('')
  const [mode, setMode] = useState<'ready' | 'groq' | 'notes'>('ready')
  const sequence = useRef(0), topic = useRef<string | null>(null), pending = useRef(false), lastQuestion = useRef('')
  const generation = useRef(0), transcript = useRef<TifaMessage[]>([]), request = useRef<AbortController | null>(null), cooldown = useRef(0)
  const lastFailure = useRef('provider_unavailable')
  const publish = useCallback((next: TifaMessage[]) => { transcript.current = next; setMessages(next) }, [])
  useEffect(() => () => { generation.current++; request.current?.abort() }, [])

  const send = useCallback(async (question: string, retry = false) => {
    const text = question.trim().slice(0, 500)
    if (!text || pending.current) return false
    pending.current = true; setReplying(true); setError(''); lastQuestion.current = text
    const current = generation.current, controller = new AbortController()
    request.current = controller
    let previous = transcript.current
    if (retry && previous[previous.length-1]?.role === 'tifa') previous = previous.slice(0, -1)
    const next: TifaMessage[] = retry ? previous : [...previous, { id: ++sequence.current, role: 'user', text }]
    publish(next)
    const history: ChatTurn[] = next.slice(-11).map(message => ({ role: message.role === 'user' ? 'user' : 'assistant', content: message.text.slice(0, message.role === 'user' ? 500 : 2000) }))
    const timer = window.setTimeout(() => controller.abort(), 17000)
    try {
      if (Date.now() < cooldown.current && (!retry || lastFailure.current === 'rate_limited')) throw new TifaServiceError('cooldown')
      const answer = await requestTifa(endpoint, history, controller.signal)
      if (generation.current !== current) return true
      topic.current = answer.topic?.replace(/^article:(0[1-4])$/, 'project:$1') || null; cooldown.current = 0; setMode('groq')
      publish([...next, { id: ++sequence.current, role: 'tifa', text: answer.text, answer, source: 'groq' }])
    } catch (error) {
      if (generation.current !== current) return true
      const answer = answerTifa(text, tifaNotes, topic.current)
      const blocked = error instanceof TifaServiceError && error.code === 'cooldown'
      const code = blocked ? lastFailure.current : error instanceof TifaServiceError ? error.code : controller.signal.aborted ? 'timeout' : 'connection_interrupted'
      if (!blocked) {
        lastFailure.current = code
        cooldown.current = Date.now() + (error instanceof TifaServiceError && error.retryAfter ? error.retryAfter : code === 'rate_limited' ? 30 : 10) * 1000
      }
      topic.current = answer.topic; setMode('notes')
      setError(tifaUnavailableMessage(code))
      publish([...next, { id: ++sequence.current, role: 'tifa', text: answer.text, answer, source: 'notes' }])
    } finally {
      window.clearTimeout(timer)
      if (generation.current === current) { pending.current = false; request.current = null; setReplying(false) }
    }
    return true
  }, [publish])
  const clear = useCallback(() => { generation.current++; request.current?.abort(); request.current = null; pending.current = false; topic.current = null; publish([]); setReplying(false); setError(''); setMode('ready') }, [publish])
  const retry = useCallback(() => send(lastQuestion.current, true), [send])
  return { messages, replying, error, mode, send, clear, retry }
}
