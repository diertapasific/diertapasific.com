import type { TifaNote, TifaAnswer } from '../src/desk/tifaAnswers'
import type { ChatTurn } from './tifaContext.mjs'
export function normalizeTifaQuestion(value: string): string
export function isTifaIntroduction(question: string): boolean
export function resolveTifaFocus(messages: ChatTurn[], notes: TifaNote[], previousTopic?: string | null): string | null
export function profileReply(messages: ChatTurn[], notes: TifaNote[], previousTopic?: string | null): TifaAnswer | null
