import { createHash } from 'node:crypto'
import { createCloudStore } from './cloudStore.mjs'
import { createSpotifyService } from './spotifyCore.mjs'
import { handleTifa } from './tifa.mjs'

const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
const budget = (value, fallback) => /^[1-9]\d{0,5}$/.test(value || '') ? Number(value) : fallback
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export function createTifaHandler(env, notes, articles, { fetcher = fetch, store = createCloudStore(env, fetcher) } = {}) {
  return async request => {
    const origin = new URL(request.url).origin
    const runtime = { GROQ_API_KEY: env.GROQ_API_KEY, GROQ_MODEL: env.GROQ_MODEL, GROQ_FALLBACK_MODEL: env.GROQ_FALLBACK_MODEL, ALLOWED_ORIGIN: origin }
    if (request.method !== 'POST' || request.headers.get('Sec-Fetch-Site') === 'cross-site' || request.headers.get('Origin') && request.headers.get('Origin') !== origin || request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json' || !env.GROQ_API_KEY) {
      return handleTifa(request, runtime, notes, fetcher, articles)
    }
    if (!store.configured) return json({ error: 'setup_required' }, 503)
    try {
      // Vercel supplies this header; only a digest is retained for the brief quota window.
      const address = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || 'unknown'
      const visitor = createHash('sha256').update(address.split(',')[0].trim()).digest('hex').slice(0, 32)
      const allowance = await store.quota(`tifa:quota:${visitor}`, 8, 60)
      if (!allowance.allowed) return json({ error: 'rate_limited', retryAfter: allowance.retryAfter }, 429, { 'Retry-After': String(allowance.retryAfter) })
      return await handleTifa(request, runtime, notes, fetcher, articles, () => store.quotaAll([
        { name: `tifa:daily:${visitor}`, limit: budget(env.TIFA_DAILY_VISITOR_LIMIT, 40), seconds: 86400 },
        { name: 'tifa:provider:minute', limit: budget(env.TIFA_GLOBAL_MINUTE_LIMIT, 20), seconds: 60 },
        { name: 'tifa:provider:day', limit: budget(env.TIFA_GLOBAL_DAILY_LIMIT, 500), seconds: 86400 },
      ]))
    } catch { return json({ error: 'provider_unavailable' }, 503) }
  }
}

export function createSpotifyHandler(env, { fetcher = fetch, store = createCloudStore(env, fetcher), now = Date.now, sleep = wait } = {}) {
  const readConnection = async () => {
    let connection = await store.get('spotify:connection')
    if (!connection && env.SPOTIFY_REFRESH_TOKEN) {
      connection = { clientId: env.SPOTIFY_CLIENT_ID, refreshToken: env.SPOTIFY_REFRESH_TOKEN, authorizedAt: now() }
      await store.set('spotify:connection', connection)
    }
    return connection
  }
  const service = createSpotifyService({
    clientId: env.SPOTIFY_CLIENT_ID,
    readConnection, writeConnection: value => store.set('spotify:connection', value),
    readLastObserved: () => store.get('spotify:observed'), writeLastObserved: value => value ? store.observe(value) : store.set('spotify:observed', null),
    refreshHistory: true, fetcher, now,
  })
  const respond = snapshot => json(snapshot, 200, snapshot.stale ? {} : { 'Vercel-CDN-Cache-Control': 's-maxage=5' })
  const fresh = cached => cached && now() < Math.max(cached.savedAt + 5000, cached.retryAt || 0)
  return async request => {
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET' })
    if (!store.configured || !service.configured) return json({ status: 'disconnected', track: null, updatedAt: now() }, 503)
    let lease = null
    try {
      const cached = await store.get('spotify:snapshot')
      if (fresh(cached)) return respond(cached.data)
      // The lease covers token refresh and playback reads across cold instances.
      lease = await store.acquire('spotify:poll', 30)
      if (!lease) {
        for (let attempt = 0; attempt < 16; attempt++) {
          await sleep(250)
          const shared = await store.get('spotify:snapshot')
          if (fresh(shared)) return respond(shared.data)
        }
        if (cached?.data.track) return respond({ ...cached.data, stale: true, status: 'unavailable' })
        return json({ status: 'unavailable', track: null, updatedAt: now(), stale: true }, 503)
      }
      // A previous holder can finish between our first read and acquiring the lease.
      const shared = await store.get('spotify:snapshot')
      if (fresh(shared)) return respond(shared.data)
      let snapshot = await service.nowPlaying()
      if (snapshot.stale && !snapshot.track && cached?.data.track) snapshot = { ...snapshot, track: cached.data.track }
      await store.set('spotify:snapshot', { data: snapshot, savedAt: now(), retryAt: service.retryAt }, 86400)
      return respond(snapshot)
    } catch { return json({ status: 'unavailable', track: null, updatedAt: now(), stale: true }, 503) }
    finally { if (lease) await store.release('spotify:poll', lease).catch(() => {}) }
  }
}
