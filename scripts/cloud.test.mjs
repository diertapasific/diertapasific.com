import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpotifyHandler, createTifaHandler } from '../server/vercelBackend.mjs'
import { createCloudStore } from '../server/cloudStore.mjs'

const CLIENT = '422e9c35a9d64240bbb57440d968061b'
const env = { SPOTIFY_CLIENT_ID: CLIENT, SPOTIFY_REFRESH_TOKEN: 'seed-private', GROQ_API_KEY: 'groq-private' }
const track = { id: 'track7', name: 'Newer track', artists: [{ name: 'Artist' }], album: { name: 'Album', images: [] }, external_urls: { spotify: 'https://open.spotify.com/track/track7' }, duration_ms: 203000 }
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers })
const request = () => new Request('https://desk.example/api/spotify/now-playing')
function memoryStore() {
  const values = new Map(), leases = new Map(), counts = new Map()
  return { configured: true, values, leases,
    async get(key) { return values.get(key) || null },
    async set(key, value) { values.set(key, structuredClone(value)) },
    async acquire(key) { if (leases.has(key)) return null; const lease = 'lease'; leases.set(key, lease); return lease },
    async release(key, lease) { if (leases.get(key) === lease) leases.delete(key) },
    async observe(value) { if (!values.get('spotify:observed') || value.observedAt >= values.get('spotify:observed').observedAt) values.set('spotify:observed', structuredClone(value)) },
    async quota(key, limit) { const count = (counts.get(key) || 0) + 1; counts.set(key, count); return { allowed: count <= limit, retryAfter: 60 } },
  }
}
test('cold Spotify instances share cache, persist rotation, and never return private credentials', async () => {
  const store = memoryStore(); let calls = 0
  const fetcher = async url => { calls++; return url.includes('/api/token') ? json({ access_token: 'access-private', refresh_token: 'rotated-private', expires_in: 3600 }) : json({ item: track, is_playing: true }) }
  const first = createSpotifyHandler(env, { store, fetcher })
  const a = await (await first(request())).json()
  const second = createSpotifyHandler(env, { store, fetcher })
  const b = await (await second(request())).json()
  assert.equal(calls, 2); assert.equal(a.status, 'playing'); assert.deepEqual(a, b)
  assert.equal(store.values.get('spotify:connection').refreshToken, 'rotated-private')
  assert.doesNotMatch(JSON.stringify(a), /private|refresh_token|access_token/)
  assert.equal(store.leases.size, 0)
})
test('parallel cold Spotify instances serialize refresh with a distributed lease', async () => {
  const store = memoryStore(); let calls = 0
  const fetcher = async url => { calls++; await new Promise(resolve => setTimeout(resolve, 3)); return url.includes('/api/token') ? json({ access_token: 'access-private', expires_in: 3600 }) : json({ item: track, is_playing: true }) }
  const handlers = Array.from({ length: 6 }, () => createSpotifyHandler(env, { store, fetcher, sleep: () => new Promise(resolve => setTimeout(resolve, 2)) }))
  const results = await Promise.all(handlers.map(async handler => (await handler(request())).json()))
  assert.ok(results.every(value => value.status === 'playing')); assert.equal(calls, 2)
})
test('Spotify provider backoff survives a cold instance and does not label old playback live', async () => {
  const store = memoryStore(); let clock = 1000000, limited = false, calls = 0
  const fetcher = async url => { calls++; return url.includes('/api/token') ? json({ access_token: 'private', expires_in: 3600 }) : limited ? json({}, 429, { 'Retry-After': '90' }) : json({ item: track, is_playing: true }) }
  await createSpotifyHandler(env, { store, fetcher, now: () => clock })(request())
  limited = true; clock += 6000
  const stale = await (await createSpotifyHandler(env, { store, fetcher, now: () => clock })(request())).json()
  const count = calls; clock += 80000
  const cached = await (await createSpotifyHandler(env, { store, fetcher, now: () => clock })(request())).json()
  assert.equal(calls, count); assert.equal(stale.status, 'unavailable'); assert.equal(cached.stale, true); assert.equal(cached.track.id, track.id)
})
test('cloud history can replace an observation missed while the site was idle, but older history cannot', async () => {
  for (const age of [-1000, 1000]) {
    const store = memoryStore(), clock = 1000000
    await store.set('spotify:observed', { clientId: CLIENT, track: { id: 'old', title: 'Old track', href: 'https://open.spotify.com/track/old' }, observedAt: clock })
    const fetcher = async url => url.includes('/api/token') ? json({ access_token: 'private', expires_in: 3600 }) : url.includes('currently-playing') ? new Response(null, { status: 204 }) : json({ items: [{ track, played_at: new Date(clock + age).toISOString() }] })
    const result = await (await createSpotifyHandler(env, { store, fetcher, now: () => clock + 3000 })(request())).json()
    assert.equal(result.track.id, age > 0 ? track.id : 'old')
  }
})
test('missing storage and non-GET Spotify requests fail without reaching a provider', async () => {
  const handler = createSpotifyHandler(env, { store: { configured: false }, fetcher: () => { throw Error('must not call') } })
  assert.equal((await handler(request())).status, 503)
  assert.equal((await handler(new Request(request().url, { method: 'POST' }))).status, 405)
})
test('Tifa rejects foreign origins and shares a bounded quota across independent functions', async () => {
  const store = memoryStore(); let calls = 0
  const fetcher = async () => { calls++; return json({ choices: [{ message: { content: JSON.stringify({ reply: 'Dipa builds software.', sourceIds: [] }) } }] }) }
  const req = (origin = 'https://desk.example') => new Request('https://desk.example/api/tifa', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.4' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Who is Dipa?' }] }) })
  assert.equal((await createTifaHandler(env, [], [], { store, fetcher })(req('https://foreign.example'))).status, 403)
  for (let n = 0; n < 8; n++) assert.equal((await createTifaHandler(env, [], [], { store, fetcher })(req())).status, 200)
  const limited = await createTifaHandler(env, [], [], { store, fetcher })(req())
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '60'); assert.equal(calls, 8)
  const preflight = await createTifaHandler(env, [], [], { store, fetcher })(new Request('https://desk.example/api/tifa', { method: 'OPTIONS', headers: { Origin: 'https://desk.example' } }))
  assert.equal(preflight.status, 204)
})
test('Redis transport keeps its credential in the header and uses atomic leases and quotas', async () => {
  const commands = []
  const fetcher = async (url, init) => {
    assert.equal(url, 'https://redis.example'); assert.equal(init.headers.Authorization, 'Bearer redis-private')
    const command = JSON.parse(init.body); commands.push(command)
    return json({ result: command[0] === 'GET' ? JSON.stringify({ track: 'test' }) : command[0] === 'EVAL' && command[1].includes('INCR') ? [9, 42] : 'OK' })
  }
  const store = createCloudStore({ UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'redis-private', VERCEL_ENV: 'production' }, fetcher)
  assert.deepEqual(await store.get('snapshot'), { track: 'test' })
  const lease = await store.acquire('poll'); assert.ok(lease)
  await store.release('poll', lease)
  assert.deepEqual(await store.quota('visitor', 8), { allowed: false, retryAfter: 42 })
  assert.match(commands[0][1], /production/); assert.match(commands[2][1], /GET.*DEL/)
  assert.doesNotMatch(JSON.stringify(commands), /redis-private/)
})
