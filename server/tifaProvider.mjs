export const DEFAULT_MODEL = 'openai/gpt-oss-20b'
export const DEFAULT_FALLBACK_MODEL = 'openai/gpt-oss-120b'

export async function requestTifaProvider({ env, system, messages, schema, parse, signal, fetcher = fetch, attemptTimeoutMs = 6000, totalTimeoutMs = 12000 }) {
  const primary = env.GROQ_MODEL || DEFAULT_MODEL
  const fallback = env.GROQ_FALLBACK_MODEL ?? (primary === DEFAULT_FALLBACK_MODEL ? DEFAULT_MODEL : DEFAULT_FALLBACK_MODEL)
  const models = [...new Set([primary, fallback].filter(Boolean))].slice(0,2)
  const deadline = Date.now() + totalTimeoutMs
  let last = { error: 'provider_unavailable', status: 502 }, retryAfter = 0
  for (const model of models) {
    if (signal?.aborted) return { error: 'timeout', status: 502 }
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, Math.min(attemptTimeoutMs, remaining))
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const upstream = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, ...messages], temperature: .25, max_completion_tokens: 2048,
          ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low' } : {}),
          response_format: { type: 'json_schema', json_schema: { name: 'tifa_reply', strict: true, schema } },
        }),
      })
      const data = await upstream.json().catch(() => null)
      if (!upstream.ok) {
        const code = data?.error?.code
        const credentials = upstream.status === 401 || upstream.status === 403
        const accountQuota = ['insufficient_quota', 'billing_hard_limit_reached', 'account_deactivated'].includes(code)
        last = { error: credentials ? 'credentials_unavailable' : upstream.status === 429 || accountQuota ? 'rate_limited' : upstream.status === 404 || ['model_not_found','model_decommissioned'].includes(code) ? 'model_unavailable' : code === 'json_validate_failed' ? 'invalid_response' : 'provider_unavailable', status: upstream.status === 429 || accountQuota ? 429 : 502 }
        if (last.error === 'rate_limited') retryAfter = Math.max(retryAfter, Math.max(1, Math.min(3600, Math.ceil(Number(upstream.headers.get('Retry-After')) || 30))))
        if (credentials || accountQuota || upstream.status < 500 && !['rate_limited','model_unavailable','invalid_response'].includes(last.error)) return { ...last, ...(retryAfter ? { retryAfter } : {}) }
      } else {
        let value
        try { value = JSON.parse(data?.choices?.[0]?.message?.content || '') } catch { /* The alternate model may recover a malformed or truncated reply. */ }
        const result = data?.choices?.[0]?.finish_reason !== 'length' && parse(value)
        if (result) return { result, model }
        last = { error: 'invalid_response', status: 502 }
      }
    } catch {
      if (signal?.aborted) return { error: 'timeout', status: 502 }
      last = { error: timedOut ? 'timeout' : 'provider_unavailable', status: 502 }
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
  return retryAfter ? { error: 'rate_limited', status: 429, retryAfter } : last
}
