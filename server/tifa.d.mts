import type { TifaArticle } from './tifaContext.mjs'
import type { TifaNote } from '../src/desk/tifaAnswers'
export const DEFAULT_MODEL: string
export const PROFILE_VERSION: number
export const MAX_BODY_BYTES: number
export type TifaEnv = { GROQ_API_KEY?: string; GROQ_MODEL?: string; ALLOWED_ORIGIN?: string }
export function handleTifa(request: Request, env: TifaEnv, notes: TifaNote[], fetcher?: typeof fetch, articles?: TifaArticle[]): Promise<Response>
export function validateMessages(body: unknown): { role: 'user' | 'assistant'; content: string }[] | null
