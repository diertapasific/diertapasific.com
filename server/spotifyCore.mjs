import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-recently-played'
export const SPOTIFY_CALLBACK = 'http://127.0.0.1:5173/api/spotify/callback'
const COOKIE = 'dipa_spotify_state'
const CACHE_MS = 5_000

class SpotifyError extends Error {
  constructor(kind, retryAfter = 30) { super(kind); this.kind = kind; this.retryAfter = retryAfter }
}

function same(a, b) {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '')
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y)
}

function spotifyLink(value) {
  return typeof value === 'string' && /^https:\/\/open\.spotify\.com\/(track|episode)\/[A-Za-z0-9]+(?:\?|$)/.test(value) ? value : null
}

export function publicTrack(item, progressMs = 0) {
  if (!item || typeof item.name !== 'string' || !Number.isFinite(item.duration_ms)) return null
  const href = spotifyLink(item.external_urls?.spotify)
  if (!href) return null
  const images = [...(item.album?.images || item.images || [])].filter(image => typeof image.url === 'string' && /^https:\/\/[^/]+\.scdn\.co\//.test(image.url)).sort((a, b) => (a.width || 0) - (b.width || 0))
  return {
    id: typeof item.id === 'string' ? item.id : href,
    title: item.name,
    artist: Array.isArray(item.artists) ? item.artists.map(artist => artist.name).filter(name => typeof name === 'string').join(', ') : item.show?.publisher || item.show?.name || 'Spotify',
    album: item.album?.name || item.show?.name || '',
    artwork: (images.find(image => image.width >= 128) || images.at(-1))?.url || null,
    href,
    durationMs: Math.max(0, item.duration_ms),
    progressMs: Math.max(0, Math.min(item.duration_ms, Number(progressMs) || 0)),
  }
}

export function createSpotifyService({ clientId, redirectUri = SPOTIFY_CALLBACK, readConnection, writeConnection, readLastObserved = async () => null, writeLastObserved = async () => {}, refreshHistory = false, fetcher = fetch, now = Date.now }) {
  const sessions = new Map()
  let token = null, snapshot = null, cacheUntil = 0, pending = null, retryUntil = 0
  let lastObserved = null, observedLoaded = false, lastSavedAt = 0
  const configured = /^[a-f0-9]{32}$/i.test(clientId || '')
  const request = async (url, init) => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 8000)
    try { return await fetcher(url, { ...init, signal: controller.signal }) }
    finally { clearTimeout(timer) }
  }
  const tokenRequest = async parameters => {
    const response = await request('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, ...parameters }) })
    if (response.status === 429) throw new SpotifyError('rate_limited', Math.min(600, Math.max(15, Number(response.headers.get('Retry-After')) || 30)))
    if (!response.ok) throw new SpotifyError(response.status === 400 || response.status === 401 ? 'reconnect' : 'unavailable')
    const data = await response.json()
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in) || data.expires_in <= 0) throw new SpotifyError('unavailable')
    token = { value: data.access_token, expiresAt: now() + Math.max(1, data.expires_in - 30) * 1000 }
    return data
  }
  const accessToken = async () => {
    if (token && token.expiresAt > now()) return token.value
    const connection = await readConnection()
    if (connection?.clientId !== clientId || !connection.refreshToken) throw new SpotifyError('disconnected')
    const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: connection.refreshToken })
    if (data.refresh_token && data.refresh_token !== connection.refreshToken) await writeConnection({ ...connection, refreshToken: data.refresh_token })
    return token.value
  }
  const api = async (path, retried = false) => {
    const bearer = await accessToken()
    const response = await request(`https://api.spotify.com/v1/${path}`, { headers: { Authorization: `Bearer ${bearer}` } })
    if (response.status === 401 && !retried) { token = null; return api(path, true) }
    if (response.status === 429) {
      const seconds = Math.min(600, Math.max(15, Number(response.headers.get('Retry-After')) || 30))
      throw new SpotifyError('rate_limited', seconds)
    }
    if (response.status === 204) return null
    if (!response.ok) throw new SpotifyError(response.status === 401 ? 'reconnect' : response.status === 403 ? 'access_denied' : 'unavailable')
    return response.json()
  }
  return {
    configured,
    get retryAt() { return retryUntil },
    begin() {
      if (!configured) throw new SpotifyError('setup')
      for (const [key, session] of sessions) if (session.expiresAt < now()) sessions.delete(key)
      if (sessions.size >= 8) sessions.delete(sessions.keys().next().value)
      const state = randomBytes(32).toString('base64url'), verifier = randomBytes(64).toString('base64url')
      sessions.set(state, { verifier, expiresAt: now() + 600_000 })
      const url = new URL('https://accounts.spotify.com/authorize')
      url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: SPOTIFY_SCOPES, state, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString()
      return { state, url: url.href }
    },
    async complete({ code, state, cookieState, error }) {
      const session = sessions.get(state)
      if (!session || !same(state, cookieState) || session.expiresAt < now()) throw new SpotifyError('invalid_state')
      sessions.delete(state)
      if (error || !code) throw new SpotifyError('cancelled')
      const data = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: session.verifier })
      if (!data.refresh_token) { token = null; throw new SpotifyError('unavailable') }
      try { await writeConnection({ clientId, refreshToken: data.refresh_token, authorizedAt: now(), scopes: data.scope || SPOTIFY_SCOPES }) }
      catch (error) { token = null; throw error }
      snapshot = null; lastObserved = null; observedLoaded = true; lastSavedAt = 0; cacheUntil = retryUntil = 0
      await writeLastObserved(null).catch(() => {})
    },
    async nowPlaying() {
      if (!configured) return { status: 'disconnected', track: null, updatedAt: now() }
      if (snapshot && now() < Math.max(cacheUntil, retryUntil)) return snapshot
      if (pending) return pending
      pending = (async () => {
        try {
          if (!observedLoaded) {
            const saved = await readLastObserved().catch(() => null)
            if (saved?.clientId === clientId && spotifyLink(saved.track?.href) && Number.isFinite(saved.observedAt)) { lastObserved = saved; lastSavedAt = saved.observedAt }
            observedLoaded = true
          }
          const current = await api('me/player/currently-playing?additional_types=track,episode')
          const track = publicTrack(current?.item, current?.progress_ms)
          if (track) {
            const observedAt = now()
            const save = !lastObserved || lastObserved.track.id !== track.id || observedAt - lastSavedAt >= 15000
            lastObserved = { clientId, track, observedAt }
            if (save) await writeLastObserved(lastObserved).then(() => { lastSavedAt = observedAt }).catch(() => {})
            snapshot = { status: current.is_playing ? 'playing' : 'paused', track, updatedAt: observedAt, stale: false, source: 'current' }
          } else {
            if (lastObserved && lastObserved.observedAt > lastSavedAt) await writeLastObserved(lastObserved).then(() => { lastSavedAt = lastObserved.observedAt }).catch(() => {})
            // A cloud instance may not have seen playback while nobody visited.
            // A newer provider history entry can fill that gap; an older entry
            // cannot replace a track we actually observed more recently.
            let recentTrack = null, playedAt = NaN
            if (!lastObserved || refreshHistory) {
              try {
                const recent = await api('me/player/recently-played?limit=1')
                recentTrack = publicTrack(recent?.items?.[0]?.track)
                playedAt = Date.parse(recent?.items?.[0]?.played_at || '')
              } catch (error) { if (!lastObserved || error?.kind === 'rate_limited') throw error }
            }
            if (lastObserved && (!recentTrack || !Number.isFinite(playedAt) || playedAt <= lastObserved.observedAt)) {
              snapshot = { status: 'recent', track: lastObserved.track, playedAt: lastObserved.observedAt, source: 'observed', updatedAt: now(), stale: false }
            } else {
              snapshot = { status: recentTrack ? 'recent' : 'idle', track: recentTrack, playedAt: Number.isFinite(playedAt) ? playedAt : undefined, source: 'history', updatedAt: now(), stale: false }
            }
          }
          cacheUntil = now() + CACHE_MS
        } catch (error) {
          const kind = error instanceof SpotifyError ? error.kind : 'unavailable'
          const staleTrack = snapshot?.track || lastObserved?.track || null
          snapshot = { status: ['disconnected', 'reconnect', 'access_denied'].includes(kind) ? kind : 'unavailable', track: staleTrack, updatedAt: snapshot?.updatedAt || now(), stale: true }
          retryUntil = now() + (error instanceof SpotifyError ? error.retryAfter : 30) * 1000
          cacheUntil = now() + CACHE_MS
        }
        return snapshot
      })().finally(() => { pending = null })
      return pending
    },
  }
}
