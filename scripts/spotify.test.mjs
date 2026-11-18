import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSpotifyService, fileConnectionStore, publicTrack, SPOTIFY_CALLBACK, SPOTIFY_SCOPES } from '../server/spotify.mjs'

const CLIENT = '422e9c35a9d64240bbb57440d968061b'
const item = { id: 'track7', name: 'A track for the test', artists: [{ name: 'An artist' }], album: { name: 'An album', images: [{ url: 'https://i.scdn.co/image/cover', width: 300 }] }, external_urls: { spotify: 'https://open.spotify.com/track/track7' }, duration_ms: 203000 }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
function fixture(handler, connection = { clientId: CLIENT, refreshToken: 'private-refresh' }, observedStore = {}) {
  let clock = 1000000, saved = connection
  const calls = [], writes = []
  const service = createSpotifyService({ clientId: CLIENT, ...observedStore, now: () => clock, readConnection: async () => saved, writeConnection: async value => { saved = value; writes.push(value) }, fetcher: async (url, init) => { calls.push({ url, init }); return handler(url, init, calls) } })
  return { service, calls, writes, advance: milliseconds => { clock += milliseconds }, saved: () => saved }
}
const tokenResponse = () => json({ access_token: 'private-access', expires_in: 3600 })

test('PKCE sends only listening scopes and exchanges a browser-bound one-time code', async () => {
  let verifier
  const f = fixture(async (url, init) => {
    assert.equal(url, 'https://accounts.spotify.com/api/token')
    verifier = init.body.get('code_verifier')
    assert.equal(init.body.get('client_id'), CLIENT)
    assert.equal(init.body.get('redirect_uri'), SPOTIFY_CALLBACK)
    assert.equal(init.body.get('client_secret'), null)
    return json({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600, scope: SPOTIFY_SCOPES })
  }, null)
  const authorization = f.service.begin(), url = new URL(authorization.url)
  assert.equal(url.searchParams.get('scope'), SPOTIFY_SCOPES)
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
  await f.service.complete({ code: 'one-use-code', state: authorization.state, cookieState: authorization.state })
  assert.equal(createHash('sha256').update(verifier).digest('base64url'), url.searchParams.get('code_challenge'))
  assert.equal(f.saved().refreshToken, 'private-refresh')
  await assert.rejects(f.service.complete({ code: 'one-use-code', state: authorization.state, cookieState: authorization.state }), /invalid_state/)
  assert.equal(f.calls.length, 1)
})

test('wrong browser state, missing state, and expired callbacks cannot store a connection', async () => {
  const f = fixture(() => { throw Error('Provider must not be called') }, null)
  const authorization = f.service.begin()
  await assert.rejects(f.service.complete({ code: 'code', state: authorization.state, cookieState: 'wrong-browser' }), /invalid_state/)
  await assert.rejects(f.service.complete({ code: 'code', state: 'missing', cookieState: 'missing' }), /invalid_state/)
  f.advance(600001)
  await assert.rejects(f.service.complete({ code: 'code', state: authorization.state, cookieState: authorization.state }), /invalid_state/)
  assert.equal(f.calls.length, 0); assert.equal(f.writes.length, 0)
})

test('denying consent keeps the previous connection intact', async () => {
  const f = fixture(() => { throw Error('Provider must not be called') })
  const authorization = f.service.begin()
  await assert.rejects(f.service.complete({ error: 'access_denied', state: authorization.state, cookieState: authorization.state }), /cancelled/)
  assert.equal(f.saved().refreshToken, 'private-refresh')
  assert.equal(f.writes.length, 0)
})

test('simultaneous viewers share a cached request and receive no account credentials', async () => {
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : json({ item, progress_ms: 72000, is_playing: true }))
  const snapshots = await Promise.all(Array.from({ length: 12 }, () => f.service.nowPlaying()))
  assert.ok(snapshots.every(snapshot => snapshot.status === 'playing' && snapshot.track.progressMs === 72000))
  assert.equal(f.calls.length, 2)
  assert.doesNotMatch(JSON.stringify(snapshots), /private-access|private-refresh|access_token|refresh_token/)
  await f.service.nowPlaying(); assert.equal(f.calls.length, 2)
  f.advance(4999); await f.service.nowPlaying(); assert.equal(f.calls.length, 2)
  f.advance(2); await f.service.nowPlaying(); assert.equal(f.calls.length, 3)
})

test('no active player falls back to the actual most recently played track', async () => {
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [{ track: item }] }))
  const snapshot = await f.service.nowPlaying()
  assert.equal(snapshot.status, 'recent'); assert.equal(snapshot.track.title, item.name)
  assert.equal(snapshot.track.progressMs, 0)
  assert.ok(f.calls.at(-1).url.endsWith('recently-played?limit=1'))
})

test('paused playback and an empty history are represented honestly', async () => {
  const paused = fixture(async url => url.includes('/api/token') ? tokenResponse() : json({ item, is_playing: false, progress_ms: 85000 }))
  assert.equal((await paused.service.nowPlaying()).status, 'paused')
  const idle = fixture(async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [] }))
  assert.equal((await idle.service.nowPlaying()).status, 'idle')
})

test('rotated refresh tokens are stored and expired connections request reconnection', async () => {
  const rotated = fixture(async url => url.includes('/api/token') ? json({ access_token: 'private-access', refresh_token: 'new-private-refresh', expires_in: 3600 }) : json({ item, is_playing: true }))
  await rotated.service.nowPlaying(); assert.equal(rotated.saved().refreshToken, 'new-private-refresh')
  const expired = fixture(async () => json({ error: 'invalid_grant' }, 400))
  const snapshot = await expired.service.nowPlaying()
  assert.equal(snapshot.status, 'reconnect'); assert.equal(snapshot.track, null)
  assert.doesNotMatch(JSON.stringify(snapshot), /invalid_grant|private-refresh/)
})

test('Spotify rate limits are respected and stale data is never labeled as live', async () => {
  let limited = false
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : limited ? json({}, 429, { 'Retry-After': '90' }) : json({ item, is_playing: true }))
  await f.service.nowPlaying(); limited = true; f.advance(15001)
  const stale = await f.service.nowPlaying()
  assert.equal(stale.status, 'unavailable'); assert.equal(stale.stale, true); assert.equal(stale.track.title, item.name)
  const count = f.calls.length
  f.advance(80000); await f.service.nowPlaying(); assert.equal(f.calls.length, count)
  f.advance(10001); await f.service.nowPlaying(); assert.equal(f.calls.length, count + 1)
})

test('an unauthorized player read refreshes once and then stops retrying', async () => {
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : json({}, 401))
  const snapshot = await f.service.nowPlaying()
  assert.equal(snapshot.status, 'reconnect')
  assert.equal(f.calls.filter(call => call.url.includes('/api/token')).length, 2)
  assert.equal(f.calls.filter(call => call.url.includes('currently-playing')).length, 2)
})

test('the public payload rejects unsafe URLs and strips unrelated provider data', () => {
  assert.equal(publicTrack({ ...item, external_urls: { spotify: 'javascript:alert(1)' } }), null)
  const track = publicTrack({ ...item, access_token: 'secret', album: { name: 'Album', images: [{ url: 'https://untrusted.example/image.jpg' }] } }, 900000)
  assert.equal(track.artwork, null); assert.equal(track.progressMs, item.duration_ms)
  assert.doesNotMatch(JSON.stringify(track), /secret|access_token/)
})

test('connection files are private and are not created until authorization completes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'desk-spotify-test-')), store = fileConnectionStore(join(directory, 'private'))
  try {
    assert.equal(await store.readConnection(), null)
    await store.writeConnection({ clientId: CLIENT, refreshToken: 'test-only-token' })
    assert.equal((await store.readConnection()).refreshToken, 'test-only-token')
    assert.equal((await stat(join(directory, 'private'))).mode & 0o777, 0o700)
    assert.equal((await stat(join(directory, 'private', 'connection.json'))).mode & 0o777, 0o600)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('a failed credential save does not leave an account connected in memory', async () => {
  let apiCalls = 0
  const service = createSpotifyService({ clientId: CLIENT, readConnection: async () => null, writeConnection: async () => { throw Error('storage failure') }, fetcher: async url => { if (!url.includes('/api/token')) apiCalls++; return json({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600 }) } })
  const authorization = service.begin()
  await assert.rejects(service.complete({ code: 'code', state: authorization.state, cookieState: authorization.state }), /storage failure/)
  assert.equal((await service.nowPlaying()).status, 'disconnected'); assert.equal(apiCalls, 0)
})


test('an older history entry cannot replace the latest observed song, including after a restart', async () => {
  let current = true, saved = null
  const store = { readLastObserved: async () => saved, writeLastObserved: async value => { saved = value } }
  const historyItem = { ...item, id: 'older', name: 'An older song' }
  const handler = async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing')
    ? current ? json({ item, is_playing: true, progress_ms: 47000 }) : new Response(null, { status: 204 })
    : json({ items: [{ track: historyItem, played_at: new Date(100000).toISOString() }] })
  const f = fixture(handler, undefined, store)
  assert.equal((await f.service.nowPlaying()).status, 'playing')
  current = false; f.advance(5001)
  const last = await f.service.nowPlaying()
  assert.equal(last.track.title, item.name); assert.equal(last.status, 'recent'); assert.equal(last.source, 'observed')
  const restarted = fixture(handler, undefined, store)
  assert.equal((await restarted.service.nowPlaying()).track.title, item.name)
  assert.equal(saved.track.progressMs, 47000)
})

test('a later history timestamp cannot displace the last track actually observed live', async () => {
  const historyItem = { ...item, id: 'newer', name: 'A newer song' }
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [{ track: historyItem, played_at: new Date(950000).toISOString() }] }), undefined,
    { readLastObserved: async () => ({ clientId: CLIENT, track: publicTrack(item), observedAt: 900000 }) })
  const snapshot = await f.service.nowPlaying()
  assert.equal(snapshot.track.title, item.name); assert.equal(snapshot.source, 'observed'); assert.equal(snapshot.playedAt, 900000)
  assert.equal(f.calls.some(call => call.url.includes('recently-played')), false)
})

test('frequent live reads still persist the latest observation at a bounded interval', async () => {
  const writes = []
  let current = true
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing') ? current ? json({ item, is_playing: true }) : new Response(null, { status: 204 }) : json({ items: [] }), undefined,
    { writeLastObserved: async value => { writes.push(value) } })
  await f.service.nowPlaying()
  for (let i = 0; i < 4; i++) { f.advance(5001); await f.service.nowPlaying() }
  assert.equal(writes.length, 2)
  assert.equal(writes[1].observedAt, 1015003)
  current = false; f.advance(5001); await f.service.nowPlaying()
  assert.equal(writes.length, 3); assert.equal(writes[2].observedAt, 1020004)
})

test('reconnecting clears previous observations and another app cache is ignored', async () => {
  let saved = { clientId: 'another-app', track: publicTrack(item), observedAt: 999999 }
  const f = fixture(async url => url.includes('/api/token') ? json({ access_token: 'private-access', refresh_token: 'private-refresh', expires_in: 3600 }) : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [] }), undefined,
    { readLastObserved: async () => saved, writeLastObserved: async value => { saved = value } })
  assert.equal((await f.service.nowPlaying()).status, 'idle')
  const authorization = f.service.begin()
  await f.service.complete({ code: 'code', state: authorization.state, cookieState: authorization.state })
  assert.equal(saved, null)
  assert.equal((await f.service.nowPlaying()).status, 'idle')
})


test('new live playback replaces the saved track and becomes the next last-seen fallback', async () => {
  let current = true, saved = { clientId: CLIENT, track: publicTrack({ ...item, id: 'older', name: 'Previously observed' }), observedAt: 900000 }
  const f = fixture(async url => url.includes('/api/token') ? tokenResponse() : url.includes('currently-playing') ? current ? json({ item, is_playing: true, progress_ms: 60000 }) : new Response(null, { status: 204 }) : json({ items: [] }), undefined,
    { readLastObserved: async () => saved, writeLastObserved: async value => { saved = value } })
  const live = await f.service.nowPlaying()
  assert.equal(live.status, 'playing'); assert.equal(live.track.title, item.name)
  current = false; f.advance(5001)
  const recent = await f.service.nowPlaying()
  assert.equal(recent.source, 'observed'); assert.equal(recent.track.title, item.name)
  assert.equal(saved.track.title, item.name)
})
