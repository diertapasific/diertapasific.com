import type { BeforeSendEvent } from '@vercel/analytics'

// Keep analytics to page views and public paths. Chat messages, query values,
// hash state and custom event properties are never forwarded by this hook.
export function publicPageView(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null
  try {
    const url = new URL(event.url)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    url.search = ''
    url.hash = ''
    return { type: 'pageview', url: url.href }
  } catch {
    return null
  }
}
