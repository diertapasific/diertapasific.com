import { loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { handleTifa, MAX_BODY_BYTES, validateMessages } from './tifa.mjs'
import { tifaArticles } from './tifaArticles'
import { tifaNotes } from '../src/desk/tifaKnowledge'

export function tifaPlugin(): Plugin {
  return {
    name: 'local-tifa',
    configureServer(server) {
      const env = { ...loadEnv(server.config.mode, server.config.root, ''), ...process.env }
      server.middlewares.use('/api/tifa', async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
        if (!req.headers['content-type']?.includes('application/json')) { res.writeHead(415); res.end(); return }
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { res.writeHead(403); res.end(); return }
        const chunks: Buffer[] = []; let size = 0
        try {
          for await (const chunk of req) {
            size += chunk.length
            if (size > MAX_BODY_BYTES) { res.writeHead(413); res.end(JSON.stringify({ error: 'request_too_large' })); return }
            chunks.push(Buffer.from(chunk))
          }
          const body = Buffer.concat(chunks).toString('utf8')
          let response: Response
          if (env.GROQ_API_KEY) {
            response = await handleTifa(new Request('http://localhost/api/tifa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }), env, tifaNotes, fetch, tifaArticles)
          } else if (env.VITE_CHATDP_WORKER_URL) {
            if (!validateMessages(JSON.parse(body))) { res.writeHead(400); res.end(JSON.stringify({ error: 'invalid_messages' })); return }
            // Reuse the existing server-side credential; it is never copied into the browser.
            const remote = new URL(env.VITE_CHATDP_WORKER_URL)
            if (remote.protocol !== 'https:') throw new Error('Invalid worker URL')
            response = await fetch(remote, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(15000) })
            const data = await response.json().catch(() => null)
            const error = data?.error?.code === 'model_not_found' ? 'model_unavailable' : 'provider_unavailable'
            response = response.ok && data?.profileVersion === 2 ? Response.json(data) : Response.json({ error }, { status: 502 })
          } else response = Response.json({ error: 'setup_required' }, { status: 503 })
          res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(await response.text())
        } catch { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'provider_unavailable' })) }
      })
    },
  }
}
