import { handleTifa } from '../server/tifa.mjs'
import { tifaArticles } from '../server/tifaArticles'
import { tifaNotes } from '../src/desk/tifaKnowledge'

export interface Env {
  GROQ_API_KEY: string
  GROQ_MODEL?: string
  GROQ_FALLBACK_MODEL?: string
  ALLOWED_ORIGIN: string
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleTifa(request, env, tifaNotes, fetch, tifaArticles)
  },
}
