import { randomUUID } from 'node:crypto'

const RELEASE = "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end"
const QUOTA = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}"
const OBSERVE = "local old=redis.call('GET',KEYS[1]); if not old or cjson.decode(old).observedAt<=tonumber(ARGV[2]) then redis.call('SET',KEYS[1],ARGV[1]); return 1 end; return 0"

export function createCloudStore(env, fetcher = fetch) {
  const endpoint = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || ''
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || ''
  const prefix = env.REDIS_NAMESPACE || `dp:portfolio:${env.VERCEL_ENV || 'development'}:v1`
  let configured = false
  try { configured = new URL(endpoint).protocol === 'https:' && Boolean(token) } catch { /* Missing setup remains a safe 503. */ }
  const key = name => `${prefix}:${name}`
  const command = async args => {
    if (!configured) throw new Error('storage_not_configured')
    const response = await fetcher(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(4000) })
    if (!response.ok) throw new Error('storage_unavailable')
    const data = await response.json()
    if (data.error) throw new Error('storage_unavailable')
    return data.result
  }
  return {
    configured,
    async get(name) { const value = await command(['GET', key(name)]); return value ? JSON.parse(value) : null },
    async set(name, value, ttl) { return command(['SET', key(name), JSON.stringify(value), ...(ttl ? ['EX', ttl] : [])]) },
    async acquire(name, ttl = 30) {
      const lease = randomUUID()
      return await command(['SET', key(name), lease, 'NX', 'EX', ttl]) === 'OK' ? lease : null
    },
    async release(name, lease) { return command(['EVAL', RELEASE, 1, key(name), lease]) },
    async quota(name, limit, seconds = 60) {
      const [count, ttl] = await command(['EVAL', QUOTA, 1, key(name), seconds])
      return { allowed: Number(count) <= limit, retryAfter: Math.max(1, Number(ttl) || seconds) }
    },
    async observe(value) { return command(['EVAL', OBSERVE, 1, key('spotify:observed'), JSON.stringify(value), value.observedAt]) },
  }
}
