import { createTifaHandler } from '../server/vercelBackend.mjs'
import { tifaNotes } from '../src/desk/tifaKnowledge.js'
import { tifaArticles } from '../server/tifaArticles.js'

const handler = createTifaHandler(process.env, tifaNotes, tifaArticles)
export default { fetch: handler }
