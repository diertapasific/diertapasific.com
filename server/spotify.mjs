import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadEnv } from 'vite'
import { createSpotifyService, SPOTIFY_CALLBACK } from './spotifyCore.mjs'
export { createSpotifyService, publicTrack, SPOTIFY_CALLBACK, SPOTIFY_SCOPES } from './spotifyCore.mjs'
const COOKIE = 'dipa_spotify_state'

export function fileConnectionStore(directory, filename = 'connection.json') {
  const path = resolve(directory, filename)
  return {
    async readConnection() {
      try { return JSON.parse(await readFile(path, 'utf8')) }
      catch (error) { if (error.code === 'ENOENT') return null; throw error }
    },
    async writeConnection(value) {
      await mkdir(directory, { recursive: true, mode: 0o700 }); await chmod(directory, 0o700)
      const temporary = `${path}.${randomBytes(8).toString('hex')}.tmp`
      await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' })
      await rename(temporary, path); await chmod(path, 0o600)
    },
  }
}

const documentPage = (heading, text, action = '') => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotify / Dipa's desk</title><style>body{background:#f6f6f6;color:#292929;font:16px/1.65 system-ui,sans-serif;max-width:560px;margin:12vh auto;padding:24px}h1{font-size:28px;font-weight:500;letter-spacing:-1px}a{color:inherit}button,.action{display:inline-block;padding:12px 18px;border:1px solid #777;margin:16px 12px 0 0;text-decoration:none}small{color:#666}</style><h1>${heading}</h1><p>${text}</p>${action}<p><a href="/#music">Back to the speaker</a></p></html>`

export function spotifyPlugin() {
  return {
    name: 'desk-spotify-local', apply: 'serve',
    config() {
      return { server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.spotify/**'] }, watch: { ignored: ['**/.spotify/**'] } } }
    },
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, 'SPOTIFY_')
      const directory = resolve(server.config.root, '.spotify'), observed = fileConnectionStore(directory, 'last-observed.json')
      const service = createSpotifyService({ clientId: process.env.SPOTIFY_CLIENT_ID || env.SPOTIFY_CLIENT_ID, ...fileConnectionStore(directory), readLastObserved: observed.readConnection, writeLastObserved: observed.writeConnection })
      const publicStatus = process.env.SPOTIFY_PUBLIC_STATUS_URL || env.SPOTIFY_PUBLIC_STATUS_URL
      if (publicStatus && new URL(publicStatus).protocol !== 'https:') throw new Error('SPOTIFY_PUBLIC_STATUS_URL must use HTTPS')
      const interval = publicStatus ? null : setInterval(() => { void service.nowPlaying() }, 15000)
      interval?.unref()
      server.httpServer?.once('close', () => { if (interval) clearInterval(interval) })
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url || '/', SPOTIFY_CALLBACK)
        if (!url.pathname.startsWith('/api/spotify/')) return next()
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader('Referrer-Policy', 'no-referrer')
        const json = value => { response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.end(JSON.stringify(value)) }
        const html = (heading, text, action) => { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"); response.end(documentPage(heading, text, action)) }
        if (request.method !== 'GET') { response.statusCode = 405; return json({ error: 'method_not_allowed' }) }
        if (url.pathname === '/api/spotify/now-playing') {
          if (!publicStatus) return json(await service.nowPlaying())
          // Once deployed, development reads the public cloud snapshot so two
          // independent processes never rotate the same account connection.
          try {
            const cloud = await fetch(publicStatus, { signal: AbortSignal.timeout(8000) })
            response.statusCode = cloud.status
            return json(await cloud.json())
          } catch {
            response.statusCode = 503
            return json({ status: 'unavailable', track: null, updatedAt: Date.now(), stale: true })
          }
        }
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress || '')
        if (!local || request.headers.host !== '127.0.0.1:5173') { response.statusCode = 403; return json({ error: 'local_connection_only' }) }
        if (url.pathname === '/api/spotify/connect') return html('Spotify / Dipa’s desk', service.configured ? 'Connect the Spotify account whose listening activity you want to show on the speaker. Spotify will ask for permission to read your current and recently played tracks.' : 'Add SPOTIFY_CLIENT_ID to .env.local, then reopen this page.', service.configured ? '<a class="action" href="/api/spotify/authorize">Connect Spotify</a><p><small>The connection stays on this computer. No password or Client Secret is needed.</small></p>' : '')
        if (url.pathname === '/api/spotify/authorize') {
          if (!service.configured) { response.statusCode = 503; return html('Spotify is not configured yet', 'Add your Spotify app’s Client ID to the local environment first.') }
          const authorization = service.begin()
          response.setHeader('Set-Cookie', `${COOKIE}=${authorization.state}; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=600`)
          response.statusCode = 302; response.setHeader('Location', authorization.url); return response.end()
        }
        if (url.pathname === '/api/spotify/callback') {
          const cookieState = (request.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
          response.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/spotify; Max-Age=0`)
          try {
            await service.complete({ code: url.searchParams.get('code'), state: url.searchParams.get('state'), cookieState, error: url.searchParams.get('error') })
            response.statusCode = 303; response.setHeader('Location', '/#music'); return response.end()
          } catch (error) {
            response.statusCode = 400
            return html('Spotify connection was not completed', error?.kind === 'cancelled' ? 'Permission was not granted. You can reconnect whenever you want.' : 'The connection link expired or could not be verified. Start again from this computer.', '<a class="action" href="/api/spotify/connect">Try connecting again</a>')
          }
        }
        response.statusCode = 404; json({ error: 'not_found' })
      })
    },
  }
}
