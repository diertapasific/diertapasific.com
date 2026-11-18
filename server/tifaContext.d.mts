import type { TifaNote, TifaSource } from '../src/desk/tifaAnswers'
export type TifaArticle = { id: string; title: string; publishedAt: string; markdown: string; terms: string[]; sources: TifaSource[]; followups: string[] }
export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export const MAX_ARTICLE_CHARS: number
export const MAX_NOTE_CHARS: number
export function selectTifaContext(messages: ChatTurn[], notes: TifaNote[], articles?: TifaArticle[]): { notes: TifaNote[]; articles: { sourceId: string; title: string; publishedAt: string; text: string }[] }
export function compactTifaHistory(messages: ChatTurn[]): ChatTurn[]
export function suggestQuestions(sourceIds: string[], notes: TifaNote[], messages?: ChatTurn[]): string[]
