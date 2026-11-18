'use client'

import { useEffect, useState } from 'react'

export type SpotifyTrack = { id: string; title: string; artist: string; album: string; href: string; artwork: string | null; durationMs: number; progressMs: number }
export type SpotifySnapshot = { status: 'loading' | 'playing' | 'paused' | 'recent' | 'idle' | 'disconnected' | 'reconnect' | 'access_denied' | 'unavailable'; track: SpotifyTrack | null; updatedAt: number; stale?: boolean; playedAt?: number; source?: 'current' | 'observed' | 'history' }

export function useSpotifyNowPlaying(active = false) {
  const [snapshot, setSnapshot] = useState<SpotifySnapshot>({ status: 'loading', track: null, updatedAt: 0 })
  useEffect(() => {
    const endpoint = import.meta.env.VITE_SPOTIFY_API_URL || '/api/spotify/now-playing'
    if (!endpoint) { setSnapshot({ status: 'disconnected', track: null, updatedAt: Date.now() }); return }
    const interval = active ? 5000 : 15000
    let disposed = false, timer = 0, inFlight = false
    let controller: AbortController | null = null
    const poll = async () => {
      if (disposed || inFlight) return
      window.clearTimeout(timer)
      if (document.hidden) { timer = window.setTimeout(poll, interval); return }
      inFlight = true; controller = new AbortController()
      const timeout = window.setTimeout(() => controller?.abort(), 10000)
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Spotify status is unavailable')
        const data = await response.json() as SpotifySnapshot
        if (!data || typeof data.status !== 'string' || !Number.isFinite(data.updatedAt)) throw new Error('Invalid listening status')
        if (!disposed) setSnapshot(data)
      } catch {
        if (!disposed) setSnapshot(previous => ({ ...previous, status: 'unavailable', stale: true }))
      } finally {
        window.clearTimeout(timeout); inFlight = false
        if (!disposed) timer = window.setTimeout(poll, interval)
      }
    }
    const visible = () => { if (!document.hidden) void poll() }
    void poll(); document.addEventListener('visibilitychange', visible)
    return () => { disposed = true; window.clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', visible) }
  }, [active])
  return snapshot
}
